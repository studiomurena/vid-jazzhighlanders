const config = {
    type: Phaser.AUTO,
    width: 1920,
    height: 1080,
    scene: { preload: preload, create: create, update: update }
};

const game = new Phaser.Game(config);

// Variabili globali
let cielo, skyline, pavimento;
let furga;
let pali = [], ostacoli = [], nemiciSprites = [];
let bandSprites = {}; 

let faseVideo = 0; 

const membri = ['carma', 'ferraz', 'mauri', 'nan', 'falcon'];
const cattivi = ['copzombie', 'drogato']; 
const animazioni = ['idle', 'attack', 'walk', 'jump']; 

function preload() {
    this.load.image('cielo', 'assets/cielo.png');
    this.load.image('skyline', 'assets/skyline.png');
    this.load.image('pavimento', 'assets/pavimento.png');
    this.load.image('palo1', 'assets/palo1.png');
    this.load.image('palo2', 'assets/palo2.png');
    this.load.image('gommoni', 'assets/gommoni.png'); // Aggiunti i gommoni!

    this.load.spritesheet('furga_run', 'assets/furga-run.png', { frameWidth: 256, frameHeight: 256, endFrame: 24 });
    this.load.spritesheet('barili_animati', 'assets/barili.png', { frameWidth: 256, frameHeight: 256, endFrame: 24 });

    [...membri, ...cattivi].forEach(char => {
        animazioni.forEach(anim => {
            this.load.spritesheet(`${char}_${anim}`, `assets/${char}-${anim}.png`, { 
                frameWidth: 256, frameHeight: 256, endFrame: 24
            });
        });
    });
}

function create() {
    // --- 1. SFONDI ---
    cielo = this.add.tileSprite(960, 540, 1920, 1080, 'cielo').setDepth(0);
    
    // FIX SKYLINE: Altezza esatta 540, posizionata in modo che la base tocchi esattamente l'inizio del pavimento (Y=780).
    // In questo modo non si sdoppia e non lascia buchi neri!
    skyline = this.add.tileSprite(960, 510, 1920, 540, 'skyline').setDepth(1).setVisible(false);
    
    pavimento = this.add.tileSprite(960, 930, 1920, 300, 'pavimento').setDepth(2);

    // --- 2. ANIMAZIONI ---
    this.anims.create({
        key: 'furga_corsa',
        frames: this.anims.generateFrameNumbers('furga_run', { start: 0, end: 24 }),
        frameRate: 20, repeat: -1
    });

    this.anims.create({
        key: 'barili_fuoco',
        frames: this.anims.generateFrameNumbers('barili_animati', { start: 0, end: 24 }),
        frameRate: 12, repeat: -1
    });

    [...membri, ...cattivi].forEach(char => {
        animazioni.forEach(anim => {
            if (this.textures.exists(`${char}_${anim}`)) {
                this.anims.create({
                    key: `${char}_${anim}_anim`,
                    frames: this.anims.generateFrameNumbers(`${char}_${anim}`, { start: 0, end: 24 }),
                    frameRate: 12, repeat: -1
                });
            }
        });
    });

    // --- 3. INSERIMENTO ELEMENTI IN SCENA ---
    pali.push(this.add.image(2000, 540, 'palo1').setDepth(10).setScale(1.5));
    pali.push(this.add.image(3000, 540, 'palo2').setDepth(10).setScale(1.5));

    furga = this.add.sprite(960, 700, 'furga_run').setDepth(3).setScale(3.5).play('furga_corsa');

    // LA BAND: Li spargiamo bene sulla parte sinistra/centro dello schermo
    let posizioniBandX = { 'carma': 400, 'ferraz': 650, 'mauri': 900, 'nan': 1150, 'falcon': 1400 };
    membri.forEach(m => {
        bandSprites[m] = this.add.sprite(posizioniBandX[m], 780, `${m}_walk`)
            .setDepth(4)
            .setScale(1.5)
            .setVisible(false);
    });

    // SCENOGRAFIA: Barili e Gommoni sparsi (Fuori schermo a destra)
    let configOstacoli = [
        { x: 2100, y: 770, type: 'barili_animati' },
        { x: 2400, y: 820, type: 'gommoni' },
        { x: 2600, y: 790, type: 'barili_animati' },
        { x: 2900, y: 830, type: 'gommoni' },
        { x: 3100, y: 780, type: 'barili_animati' }
    ];
    
    configOstacoli.forEach(ost => {
        let elemento;
        if(ost.type === 'barili_animati') {
            elemento = this.add.sprite(ost.x, ost.y, 'barili_animati').setDepth(3).setScale(1.1).play('barili_fuoco');
        } else {
            elemento = this.add.image(ost.x, ost.y, 'gommoni').setDepth(3).setScale(1.1);
        }
        ostacoli.push(elemento);
    });

    // I NEMICI: Il copione degli accoppiamenti
    // Diciamo a ogni nemico contro chi deve andare a sbattere (targetX)
    let copioneNemici = [
        { tipo: 'copzombie', targetX: 500, y: 770 },  // Contro Carma
        { tipo: 'copzombie', targetX: 550, y: 810 },  // Contro Carma (sono in 2!)
        { tipo: 'drogato',   targetX: 750, y: 790 },  // Contro Ferraz
        { tipo: 'drogato',   targetX: 1000, y: 780 }, // Contro Mauri
        { tipo: 'copzombie', targetX: 1250, y: 800 }, // Contro Nan
        { tipo: 'drogato',   targetX: 1500, y: 790 }  // Contro Falcon
    ];

    copioneNemici.forEach((n, i) => {
        let nemico = this.add.sprite(2500 + (i * 200), n.y, `${n.tipo}_walk`)
            .setDepth(4)
            .setScale(1.5)
            .setFlipX(true); // FONDAMENTALE: Li gira verso sinistra (verso lo Studio Murena)
            
        if (this.anims.exists(`${n.tipo}_walk_anim`)) nemico.play(`${n.tipo}_walk_anim`);
        
        nemico.targetX = n.targetX; // Salviamo dove deve fermarsi
        nemiciSprites.push(nemico);
    });

    // --- LA REGIA DEI TEMPI ---

    this.time.delayedCall(20000, () => {
        faseVideo = 1; 
        skyline.setVisible(true);
        pali.forEach(p => p.setVisible(false));

        this.tweens.add({ targets: furga, x: -1000, duration: 4000, ease: 'Power2' });

        membri.forEach(m => {
            bandSprites[m].setVisible(true);
            bandSprites[m].play(`${m}_walk_anim`);
            bandSprites[m].y = 700; 
            this.tweens.add({ targets: bandSprites[m], y: 780, duration: 500, ease: 'Bounce.easeOut' });
        });
    });

    this.time.delayedCall(45000, () => {
        faseVideo = 2; 
        membri.forEach(m => bandSprites[m].play(`${m}_idle_anim`));

        // Facciamo scivolare la scenografia in campo
        this.tweens.add({ targets: ostacoli, x: '-=1200', duration: 3000, ease: 'Power2' });

        // Facciamo correre ogni nemico alla sua posizione (targetX) per fare i 1v1
        nemiciSprites.forEach(nemico => {
            this.tweens.add({
                targets: nemico,
                x: nemico.targetX,
                duration: 3000,
                ease: 'Power2',
                onComplete: () => {
                    let nome = nemico.texture.key.split('_')[0];
                    if (this.anims.exists(`${nome}_attack_anim`)) nemico.play(`${nome}_attack_anim`);
                }
            });
        });

        // Dopo 3 secondi, quando sono tutti in posizione, inizia la rissa loop
        this.time.delayedCall(3000, () => {
            iniziaRissa(this);
        });
    });
}

function iniziaRissa(scene) {
    scene.time.addEvent({
        delay: 2000,
        callback: () => {
            membri.forEach(m => {
                let mossa = Math.random() > 0.5 ? 'attack' : 'jump';
                bandSprites[m].play(`${m}_${mossa}_anim`).once('animationcomplete', () => {
                    bandSprites[m].play(`${m}_idle_anim`);
                });
            });
        },
        loop: true
    });
}

function update() {
    if (faseVideo === 0) {
        cielo.tilePositionX += 1;
        pavimento.tilePositionX += 30;
        pali.forEach(p => {
            p.x -= 50;
            if (p.x < -200) p.x = 2500 + Math.random() * 1000;
        });
    } else if (faseVideo === 1) {
        cielo.tilePositionX += 0.2;
        skyline.tilePositionX += 1; 
        pavimento.tilePositionX += 5; 
    } else if (faseVideo === 2) {
        cielo.tilePositionX += 0.1; 
    }
}
