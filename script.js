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

let faseVideo = 0; 

const membri = ['carma', 'ferraz', 'mauri', 'nan', 'falcon'];
const cattivi = ['copzombie', 'drogato']; 
// Aggiunta animazione 'hurt' (solo per i buoni, ma il codice scarterà i cattivi senza crashare)
const animazioni = ['idle', 'attack', 'walk', 'jump', 'hurt']; 

function preload() {
    this.load.image('cielo', 'assets/cielo.png');
    this.load.image('skyline', 'assets/skyline.png');
    this.load.image('rovine', 'assets/rovine.png'); // Aggiunto per la Fase 3!
    this.load.image('pavimento', 'assets/pavimento.png');
    this.load.image('palo1', 'assets/palo1.png');
    this.load.image('palo2', 'assets/palo2.png');
    this.load.image('gommoni', 'assets/gommoni.png'); 

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
    // --- 1. SFONDI A TUTTO SCHERMO ---
    // Usiamo tileScaleY = 2 per "stirare" l'altezza degli sfondi senza farli ripetere in verticale
    
    // FASE 1: Solo Cielo e Pavimento
    cielo = this.add.tileSprite(960, 540, 1920, 1080, 'cielo').setDepth(0);
    
    // FASE 2: Solo Skyline e Pavimento (Invisibile all'inizio)
    skyline = this.add.tileSprite(960, 540, 1920, 1080, 'skyline').setDepth(0).setVisible(false);
    skyline.tileScaleY = 2; // Riempe bene lo schermo dietro al pavimento
    skyline.tileScaleX = 2; 

    // FASE 3: Solo Rovine e Pavimento (Invisibile all'inizio)
    rovine = this.add.tileSprite(960, 540, 1920, 1080, 'rovine').setDepth(0).setVisible(false);
    rovine.tileScaleY = 2;
    rovine.tileScaleX = 2;

    pavimento = this.add.tileSprite(960, 930, 1920, 300, 'pavimento').setDepth(2);

    // --- 2. CREAZIONE ANIMAZIONI ---
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
                    frameRate: 15, // Rese un po' più fluide e veloci
                    repeat: -1
                });
            }
        });
    });

    // --- 3. INSERIMENTO ELEMENTI IN SCENA ---
    pali.push(this.add.image(2000, 540, 'palo1').setDepth(10).setScale(1.5));
    pali.push(this.add.image(3000, 540, 'palo2').setDepth(10).setScale(1.5));

    furga = this.add.sprite(960, 700, 'furga_run').setDepth(3).setScale(3.5).play('furga_corsa');

    // LA BAND (Disposti a sinistra)
    let posizioniBandX = { 'carma': 350, 'ferraz': 600, 'mauri': 850, 'nan': 1100, 'falcon': 1350 };
    membri.forEach(m => {
        bandSprites[m] = this.add.sprite(posizioniBandX[m], 780, `${m}_walk`)
            .setDepth(4)
            .setScale(1.5)
            .setVisible(false);
    });

    // SCENOGRAFIA: Piccoli sparsi ovunque
    let configOstacoli = [
        { x: 2100, y: 770, type: 'barili_animati' },
        { x: 2300, y: 840, type: 'gommoni' },
        { x: 2500, y: 790, type: 'barili_animati' },
        { x: 2800, y: 850, type: 'gommoni' },
        { x: 3000, y: 780, type: 'barili_animati' }
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

    // I NEMICI: Chi attacca chi!
    let copioneNemici = [
        { tipo: 'copzombie', targetX: 450,  bersaglio: 'carma',  y: 770 }, // Zombie 1 su Carma
        { tipo: 'copzombie', targetX: 500,  bersaglio: 'carma',  y: 810 }, // Zombie 2 su Carma
        { tipo: 'drogato',   targetX: 700,  bersaglio: 'ferraz', y: 790 }, // Drogato su Ferraz
        { tipo: 'drogato',   targetX: 950,  bersaglio: 'mauri',  y: 780 }, // Drogato su Mauri
        { tipo: 'copzombie', targetX: 1200, bersaglio: 'nan',    y: 800 }, // Zombie su Nan
        { tipo: 'drogato',   targetX: 1450, bersaglio: 'falcon', y: 790 }  // Drogato su Falcon
    ];

    copioneNemici.forEach((n, i) => {
        let nemico = this.add.sprite(2500 + (i * 200), n.y, `${n.tipo}_walk`)
            .setDepth(4)
            .setScale(1.5)
            .setFlipX(true); 
            
        if (this.anims.exists(`${n.tipo}_walk_anim`)) nemico.play(`${n.tipo}_walk_anim`);
        
        nemico.targetX = n.targetX; 
        nemico.bersaglioNome = n.bersaglio; // Si ricorda chi deve picchiare!
        nemiciSprites.push(nemico);
    });

    // --- LA REGIA DEI TEMPI ---

    // FASE 2: Dalla Furga a piedi
    this.time.delayedCall(20000, () => {
        faseVideo = 1; 
        
        cielo.setVisible(false); // Via il cielo
        skyline.setVisible(true); // Dentro lo skyline enorme
        
        pali.forEach(p => p.setVisible(false));
        this.tweens.add({ targets: furga, x: -1000, duration: 4000, ease: 'Power2' });

        membri.forEach(m => {
            bandSprites[m].setVisible(true);
            bandSprites[m].play(`${m}_walk_anim`);
            bandSprites[m].y = 700; 
            this.tweens.add({ targets: bandSprites[m], y: 780, duration: 500, ease: 'Bounce.easeOut' });
        });
    });

    // FASE 3: Combattimento tra le Rovine
    this.time.delayedCall(45000, () => {
        faseVideo = 2; 

        skyline.setVisible(false); // Via lo skyline
        rovine.setVisible(true);   // Dentro le rovine enormi

        membri.forEach(m => bandSprites[m].play(`${m}_idle_anim`));
        this.tweens.add({ targets: ostacoli, x: '-=1200', duration: 3000, ease: 'Power2' });

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

        this.time.delayedCall(3000, () => {
            iniziaRissa(this);
        });
    });
}

function iniziaRissa(scene) {
    // Il loop è più veloce! 1000 millisecondi invece di 2000
    scene.time.addEvent({
        delay: 1000,
        callback: () => {
            // I nemici decidono se attaccare (50% probabilità)
            nemiciSprites.forEach(nemico => {
                let nomeNemico = nemico.texture.key.split('_')[0];
                
                if (Math.random() > 0.5) {
                    // Il nemico attacca!
                    nemico.play(`${nomeNemico}_attack_anim`);
                    
                    // Il membro bersagliato si fa male!
                    let bersaglio = bandSprites[nemico.bersaglioNome];
                    
                    // Suona l'animazione HURT e poi torna in IDLE
                    if (scene.anims.exists(`${nemico.bersaglioNome}_hurt_anim`)) {
                        bersaglio.play(`${nemico.bersaglioNome}_hurt_anim`).once('animationcomplete', () => {
                            bersaglio.play(`${nemico.bersaglioNome}_idle_anim`);
                        });
                    }
                } else {
                    nemico.play(`${nomeNemico}_idle_anim`);
                }
            });

            // I membri della band attaccano (se non stanno urlando di dolore per la animazione 'hurt')
            membri.forEach(m => {
                let sprite = bandSprites[m];
                
                // Se sta già subendo un colpo (hurt in esecuzione), non interromperlo per farlo saltare/attaccare
                if (sprite.anims.currentAnim && sprite.anims.currentAnim.key.includes('hurt')) return;

                let mossa = Math.random() > 0.5 ? 'attack' : 'jump';
                sprite.play(`${m}_${mossa}_anim`).once('animationcomplete', () => {
                    // Controlla per sicurezza che non sia stato colpito nel frattempo prima di rimetterlo in idle
                    if (sprite.anims.currentAnim && sprite.anims.currentAnim.key.includes(mossa)) {
                        sprite.play(`${m}_idle_anim`);
                    }
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
        skyline.tilePositionX += 1; 
        pavimento.tilePositionX += 5; 
    } else if (faseVideo === 2) {
        rovine.tilePositionX += 0.5; // Le rovine si muovono lentissime per dare un senso di atmosfera in battaglia
    }
}
