const config = {
    type: Phaser.AUTO,
    width: 1920,
    height: 1080,
    scene: { preload: preload, create: create, update: update }
};

const game = new Phaser.Game(config);

// Variabili globali
let cielo, skyline, rovine, pavimento;
let furga;
let pali = [], ostacoli = [], nemiciSprites = [];
let bandSprites = {}; 

let faseVideo = 1; // 1=Cielo, 2=Skyline a piedi, 3=Rissa, 4=Ritorno Skyline, 5=Ritorno Cielo
let statoRissa = 0; // 0=Normale, 1=Nemici Storditi, 2=Nemici Morti
let rissaEvent; // Il timer della lotta

const membri = ['carma', 'ferraz', 'mauri', 'nan', 'falcon'];
const cattivi = ['copzombie', 'drogato']; 
// Aggiunte le animazioni di danno e morte!
const animazioni = ['idle', 'attack', 'walk', 'jump', 'hurt', 'fall', 'explode']; 

function preload() {
    this.load.image('cielo', 'assets/cielo.png');
    this.load.image('skyline', 'assets/skyline.png');
    this.load.image('rovine', 'assets/rovine.png'); 
    this.load.image('pavimento', 'assets/pavimento.png');
    this.load.image('palo1', 'assets/palo1.png');
    this.load.image('palo2', 'assets/palo2.png');
    this.load.image('gommoni', 'assets/gommoni.png'); 

    // Entrambe le animazioni del furgone
    this.load.spritesheet('furga_walk', 'assets/furga-walk.png', { frameWidth: 256, frameHeight: 256, endFrame: 24 });
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
    
    skyline = this.add.tileSprite(960, 540, 1920, 1080, 'skyline').setDepth(0).setVisible(false);
    skyline.tileScaleY = 2; skyline.tileScaleX = 2; 

    rovine = this.add.tileSprite(960, 540, 1920, 1080, 'rovine').setDepth(0).setVisible(false);
    rovine.tileScaleY = 2; rovine.tileScaleX = 2;

    // EFFETTO OMBRA ALL'ORIZZONTE (Sotto il pavimento)
    let ombraSfondo = this.add.graphics();
    ombraSfondo.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.9, 0.9);
    ombraSfondo.fillRect(0, 680, 1920, 100); // Sfuma dall'alto verso il nero scuro
    ombraSfondo.setDepth(1.5);

    pavimento = this.add.tileSprite(960, 930, 1920, 300, 'pavimento').setDepth(2);

    // EFFETTO OMBRA SUL PAVIMENTO (Per nascondere il taglio netto)
    let ombraPavimento = this.add.graphics();
    ombraPavimento.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.9, 0.9, 0, 0);
    ombraPavimento.fillRect(0, 780, 1920, 60); // Sfuma dal nero scuro verso il pavimento chiaro
    ombraPavimento.setDepth(2.1);

    // --- 2. CREAZIONE ANIMAZIONI ---
    this.anims.create({
        key: 'furga_camminata',
        frames: this.anims.generateFrameNumbers('furga_walk', { start: 0, end: 24 }),
        frameRate: 15, repeat: -1
    });

    this.anims.create({
        key: 'furga_corsa',
        frames: this.anims.generateFrameNumbers('furga_run', { start: 0, end: 24 }),
        frameRate: 22, repeat: -1
    });

    this.anims.create({
        key: 'barili_fuoco',
        frames: this.anims.generateFrameNumbers('barili_animati', { start: 0, end: 24 }),
        frameRate: 12, repeat: -1
    });

    [...membri, ...cattivi].forEach(char => {
        animazioni.forEach(anim => {
            if (this.textures.exists(`${char}_${anim}`)) {
                // Se è fall o explode, NON si deve ripetere!
                let isDeath = (anim === 'fall' || anim === 'explode');
                this.anims.create({
                    key: `${char}_${anim}_anim`,
                    frames: this.anims.generateFrameNumbers(`${char}_${anim}`, { start: 0, end: 24 }),
                    frameRate: 15, 
                    repeat: isDeath ? 0 : -1 // 0 significa suona una volta e fermati
                });
            }
        });
    });

    // --- 3. INSERIMENTO ELEMENTI ---
    pali.push(this.add.image(2000, 540, 'palo1').setDepth(10).setScale(1.5));
    pali.push(this.add.image(3000, 540, 'palo2').setDepth(10).setScale(1.5));

    furga = this.add.sprite(960, 700, 'furga_walk').setDepth(3).setScale(3.5).play('furga_camminata');

    // Timer per alternare Camminata e Corsa del Furgone
    this.time.addEvent({
        delay: 4000,
        callback: () => {
            if (faseVideo === 1 || faseVideo === 4 || faseVideo === 5) {
                if (Math.random() > 0.4) {
                    furga.play('furga_corsa');
                    this.time.delayedCall(1200, () => { furga.play('furga_camminata'); });
                }
            }
        },
        loop: true
    });

    let posizioniBandX = { 'carma': 350, 'ferraz': 600, 'mauri': 850, 'nan': 1100, 'falcon': 1350 };
    membri.forEach(m => {
        bandSprites[m] = this.add.sprite(posizioniBandX[m], 780, `${m}_walk`).setDepth(4).setScale(1.5).setVisible(false);
    });

    let configOstacoli = [
        { x: 2100, y: 770, type: 'barili_animati' }, { x: 2300, y: 840, type: 'gommoni' },
        { x: 2500, y: 790, type: 'barili_animati' }, { x: 2800, y: 850, type: 'gommoni' },
        { x: 3000, y: 780, type: 'barili_animati' }
    ];
    configOstacoli.forEach(ost => {
        let el = ost.type === 'barili_animati' ? 
            this.add.sprite(ost.x, ost.y, 'barili_animati').play('barili_fuoco') : 
            this.add.image(ost.x, ost.y, 'gommoni');
        el.setDepth(3).setScale(1.1);
        ostacoli.push(el);
    });

    let copioneNemici = [
        { tipo: 'copzombie', targetX: 450,  bersaglio: 'carma',  y: 770 },
        { tipo: 'copzombie', targetX: 500,  bersaglio: 'carma',  y: 810 },
        { tipo: 'drogato',   targetX: 700,  bersaglio: 'ferraz', y: 790 },
        { tipo: 'drogato',   targetX: 950,  bersaglio: 'mauri',  y: 780 },
        { tipo: 'copzombie', targetX: 1200, bersaglio: 'nan',    y: 800 },
        { tipo: 'drogato',   targetX: 1450, bersaglio: 'falcon', y: 790 }
    ];

    copioneNemici.forEach((n, i) => {
        let nemico = this.add.sprite(2500 + (i * 200), n.y, `${n.tipo}_walk`).setDepth(4).setScale(1.5).setFlipX(true); 
        if (this.anims.exists(`${n.tipo}_walk_anim`)) nemico.play(`${n.tipo}_walk_anim`);
        nemico.targetX = n.targetX; nemico.bersaglioNome = n.bersaglio;
        nemiciSprites.push(nemico);
    });

    // --- LA REGIA DEI TEMPI ESATTI ---

    // FASE 2: A piedi, Skyline (20s)
    this.time.delayedCall(20000, () => {
        faseVideo = 2; 
        cielo.setVisible(false); skyline.setVisible(true);
        pali.forEach(p => p.setVisible(false));

        this.tweens.add({ targets: furga, x: -1000, duration: 4000, ease: 'Power2' });
        membri.forEach(m => {
            bandSprites[m].setVisible(true).play(`${m}_walk_anim`).y = 700; 
            this.tweens.add({ targets: bandSprites[m], y: 780, duration: 500, ease: 'Bounce.easeOut' });
        });
    });

    // FASE 3: Rovine e Rissa (50s)
    this.time.delayedCall(50000, () => {
        faseVideo = 3; 
        skyline.setVisible(false); rovine.setVisible(true);
        membri.forEach(m => bandSprites[m].play(`${m}_idle_anim`));

        this.tweens.add({ targets: ostacoli, x: '-=1200', duration: 3000, ease: 'Power2' });
        nemiciSprites.forEach(n => {
            this.tweens.add({
                targets: n, x: n.targetX, duration: 3000, ease: 'Power2',
                onComplete: () => { if (this.anims.exists(`${n.texture.key.split('_')[0]}_attack_anim`)) n.play(`${n.texture.key.split('_')[0]}_attack_anim`); }
            });
        });
        
        this.time.delayedCall(3000, () => iniziaRissa(this));
    });

    // FASE 3 (IL MASSACRO): I nemici soccombono (75s)
    this.time.delayedCall(75000, () => { statoRissa = 1; }); // Storditi, subiscono botte da orbi
    this.time.delayedCall(82000, () => {
        statoRissa = 2; // Morti!
        if(rissaEvent) rissaEvent.remove(); // Stoppa il combattimento!
        
        membri.forEach(m => bandSprites[m].play(`${m}_idle_anim`)); // I regaz si fermano e guardano

        nemiciSprites.forEach(n => {
            let nome = n.texture.key.split('_')[0];
            let animMorte = nome === 'copzombie' ? 'fall' : 'explode';
            if (this.anims.exists(`${nome}_${animMorte}_anim`)) {
                n.play(`${nome}_${animMorte}_anim`).once('animationcomplete', () => {
                    this.tweens.add({ targets: n, alpha: 0, duration: 1500 }); // Svaniscono
                });
            }
        });
    });

    // FASE 4: Fuga in Furgone verso Skyline (90s)
    this.time.delayedCall(90000, () => {
        faseVideo = 4;
        rovine.setVisible(false); skyline.setVisible(true);
        
        // Sparisce la band e la monnezza
        membri.forEach(m => this.tweens.add({ targets: bandSprites[m], alpha: 0, duration: 500 }));
        ostacoli.forEach(o => this.tweens.add({ targets: o, alpha: 0, duration: 500 }));

        // Rientra il bestione
        furga.x = -800;
        furga.setVisible(true);
        this.tweens.add({ targets: furga, x: 960, duration: 2500, ease: 'Power2' });
        
        pali.forEach(p => p.setVisible(true)); // Tornano i pali a sfrecciare
    });

    // FASE 5: Cielo e chiusura (105s)
    this.time.delayedCall(105000, () => {
        faseVideo = 5;
        skyline.setVisible(false); cielo.setVisible(true);
    });
}

function iniziaRissa(scene) {
    rissaEvent = scene.time.addEvent({
        delay: 1000,
        callback: () => {
            if (statoRissa === 0) {
                // LOTTA NORMALE
                nemiciSprites.forEach(n => {
                    let nome = n.texture.key.split('_')[0];
                    if (Math.random() > 0.5) {
                        n.play(`${nome}_attack_anim`);
                        let bersaglio = bandSprites[n.bersaglioNome];
                        if (scene.anims.exists(`${n.bersaglioNome}_hurt_anim`)) {
                            bersaglio.play(`${n.bersaglioNome}_hurt_anim`).once('animationcomplete', () => bersaglio.play(`${n.bersaglioNome}_idle_anim`));
                        }
                    } else { n.play(`${nome}_idle_anim`); }
                });

                membri.forEach(m => {
                    let sprite = bandSprites[m];
                    if (sprite.anims.currentAnim && sprite.anims.currentAnim.key.includes('hurt')) return;
                    let mossa = Math.random() > 0.5 ? 'attack' : 'jump';
                    sprite.play(`${m}_${mossa}_anim`).once('animationcomplete', () => {
                        if (sprite.anims.currentAnim && sprite.anims.currentAnim.key.includes(mossa)) sprite.play(`${m}_idle_anim`);
                    });
                });
            } else if (statoRissa === 1) {
                // I NEMICI SONO STORDITI: Subiscono colpi dai regaz
                membri.forEach(m => bandSprites[m].play(`${m}_attack_anim`));
                nemiciSprites.forEach(n => {
                    let nome = n.texture.key.split('_')[0];
                    if (scene.anims.exists(`${nome}_hurt_anim`)) n.play(`${nome}_hurt_anim`);
                });
            }
        },
        loop: true
    });
}

function update() {
    if (faseVideo === 1 || faseVideo === 4 || faseVideo === 5) {
        // FURGONE IN CORSA (Veloce)
        if(faseVideo === 1) cielo.tilePositionX += 1;
        if(faseVideo === 4) skyline.tilePositionX += 2;
        if(faseVideo === 5) cielo.tilePositionX += 1;
        
        pavimento.tilePositionX += 30;
        pali.forEach(p => { p.x -= 50; if (p.x < -200) p.x = 2500 + Math.random() * 1000; });
    } else if (faseVideo === 2) {
        // A PIEDI (Lento)
        skyline.tilePositionX += 1; 
        pavimento.tilePositionX += 5; 
    } else if (faseVideo === 3) {
        // RISSA (Quasi fermo)
        rovine.tilePositionX += 0.5; 
    }
}
