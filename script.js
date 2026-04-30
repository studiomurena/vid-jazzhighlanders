const config = {
    type: Phaser.AUTO,
    width: 1920,
    height: 1080,
    scene: { preload: preload, create: create, update: update }
};

const game = new Phaser.Game(config);

// Variabili globali
let cielo, skyline, rovine, pavimento;
let furgone; 
let pali = [], ostacoli = [], nemiciSprites = [];
let bandSprites = {}; 

let faseVideo = 1; 
let statoRissa = 0; 
let rissaEvent; 

const membri = ['carma', 'ferraz', 'mauri', 'nan', 'falcon'];
const cattivi = ['copzombie', 'drogato']; 
const animazioni = ['idle', 'attack', 'walk', 'jump', 'hurt', 'fall', 'explode']; 

function preload() {
    this.load.image('cielo', 'assets/cielo.png');
    this.load.image('skyline', 'assets/skyline.png');
    this.load.image('rovine', 'assets/rovine.png'); 
    this.load.image('pavimento', 'assets/pavimento.png');
    this.load.image('palo1', 'assets/palo1.png');
    this.load.image('palo2', 'assets/palo2.png');
    this.load.image('gommoni', 'assets/gommoni.png'); 

    this.load.spritesheet('furgone_idle', 'assets/furgone-idle.png', { frameWidth: 256, frameHeight: 256, endFrame: 24 });
    this.load.spritesheet('furgone_run', 'assets/furgone-run.png', { frameWidth: 256, frameHeight: 256, endFrame: 24 });
    this.load.spritesheet('furgone_spins', 'assets/furgone-spins.png', { frameWidth: 256, frameHeight: 256, endFrame: 24 });
    
    this.load.spritesheet('barili_animati', 'assets/barili.png', { frameWidth: 256, frameHeight: 256, endFrame: 24 });

    [...membri, ...cattivi].forEach(char => {
        animazioni.forEach(anim => {
            if (this.textures.exists(`${char}_${anim}`)) {
                let isDeath = (anim === 'fall' || anim === 'explode');
                this.anims.create({
                    key: `${char}_${anim}_anim`,
                    frames: this.anims.generateFrameNumbers(`${char}_${anim}`, { start: 0, end: 24 }),
                    frameRate: 15, 
                    repeat: isDeath ? 0 : -1 
                });
            }
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

    let ombraSfondo = this.add.graphics();
    ombraSfondo.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.9, 0.9);
    ombraSfondo.fillRect(0, 680, 1920, 100); 
    ombraSfondo.setDepth(1.5);

    pavimento = this.add.tileSprite(960, 930, 1920, 300, 'pavimento').setDepth(2);

    let ombraPavimento = this.add.graphics();
    ombraPavimento.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.9, 0.9, 0, 0);
    ombraPavimento.fillRect(0, 780, 1920, 60); 
    ombraPavimento.setDepth(2.1);

    // --- 2. CREAZIONE ANIMAZIONI ---
    this.anims.create({ key: 'furgone_idle_anim', frames: this.anims.generateFrameNumbers('furgone_idle', { start: 0, end: 24 }), frameRate: 15, repeat: -1 });
    this.anims.create({ key: 'furgone_run_anim', frames: this.anims.generateFrameNumbers('furgone_run', { start: 0, end: 24 }), frameRate: 22, repeat: -1 });
    this.anims.create({ key: 'furgone_spins_anim', frames: this.anims.generateFrameNumbers('furgone_spins', { start: 0, end: 24 }), frameRate: 25, repeat: -1 });
    this.anims.create({ key: 'barili_fuoco', frames: this.anims.generateFrameNumbers('barili_animati', { start: 0, end: 24 }), frameRate: 12, repeat: -1 });

    [...membri, ...cattivi].forEach(char => {
        animazioni.forEach(anim => {
            if (this.textures.exists(`${char}_${anim}`)) {
                let isDeath = (anim === 'fall' || anim === 'explode');
                this.anims.create({
                    key: `${char}_${anim}_anim`,
                    frames: this.anims.generateFrameNumbers(`${char}_${anim}`, { start: 0, end: 24 }),
                    frameRate: 15, 
                    repeat: isDeath ? 0 : -1 
                });
            }
        });
    });

    // --- 3. INSERIMENTO ELEMENTI ---
    pali.push(this.add.image(2000, 540, 'palo1').setDepth(10).setScale(1.5));
    pali.push(this.add.image(3000, 540, 'palo2').setDepth(10).setScale(1.5));

    furgone = this.add.sprite(960, 700, 'furgone_run').setDepth(3).setScale(3.5).play('furgone_run_anim');

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

    // Avvio dei Lampi
    innescaLampi(this);

    // --- LA REGIA DEI TEMPI ESATTI ---

    // A 18 secondi: Il furgone frena sgommando (SPINS), solo qui!
    this.time.delayedCall(18000, () => {
        furgone.play('furgone_spins_anim');
        furgone.y = 650; 
        furgone.setScale(3.15); 
    });

    // FASE 2: A piedi (20s)
    this.time.delayedCall(20000, () => {
        faseVideo = 2; 
        cielo.setVisible(false); skyline.setVisible(true);
        pali.forEach(p => p.setVisible(false));

        furgone.play('furgone_run_anim'); 
        furgone.y = 700; 
        furgone.setScale(3.5); 
        
        this.tweens.add({ targets: furgone, x: -1000, duration: 4000, ease: 'Power2' });
        
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

    // IL MASSACRO (75s storditi, 82s sconfitti)
    this.time.delayedCall(75000, () => { statoRissa = 1; }); 
    this.time.delayedCall(82000, () => {
        statoRissa = 2; 
        if(rissaEvent) rissaEvent.remove(); 
        
        membri.forEach(m => bandSprites[m].play(`${m}_idle_anim`)); 

        nemiciSprites.forEach(n => {
            let nome = n.texture.key.split('_')[0];
            let animMorte = nome === 'copzombie' ? 'fall' : 'explode';
            if (this.anims.exists(`${nome}_${animMorte}_anim`)) {
                n.play(`${nome}_${animMorte}_anim`).once('animationcomplete', () => {
                    this.tweens.add({ targets: n, alpha: 0, duration: 1500 }); 
                });
            }
        });
    });

    // FASE 4: Ritorno di fiamma senza Spins (90s)
    this.time.delayedCall(90000, () => {
        faseVideo = 4;
        rovine.setVisible(false); skyline.setVisible(true);
        
        membri.forEach(m => this.tweens.add({ targets: bandSprites[m], alpha: 0, duration: 500 }));
        ostacoli.forEach(o => this.tweens.add({ targets: o, alpha: 0, duration: 500 }));

        furgone.x = -800;
        furgone.setVisible(true);
        furgone.play('furgone_run_anim'); 
        
        this.tweens.add({ targets: furgone, x: 960, duration: 2500, ease: 'Power2' });
        
        pali.forEach(p => p.setVisible(true)); 
    });

    // FASE 5: Cielo (105s)
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

// NUOVA FUNZIONE: Sistema Temporalesco Casuale
function innescaLampi(scene) {
    // Creiamo il rettangolo del lampo (Depth 1 = Dietro l'ombra, davanti allo sfondo)
    let flashRect = scene.add.rectangle(960, 540, 1920, 1080, 0xffaa00)
        .setDepth(1)
        .setAlpha(0)
        .setBlendMode(Phaser.BlendModes.ADD);

    function prossimoLampo() {
        // I lampi colpiscono tra i 5 e i 12 secondi
        let attesa = Phaser.Math.Between(5000, 12000);
        
        scene.time.delayedCall(attesa, () => {
            // Scegliamo un colore caldo a caso (Arancio scuro, Giallo ambra, Giallo acceso)
            let coloriLampi = [0xff8800, 0xffaa00, 0xffcc00];
            flashRect.fillColor = Phaser.Math.RND.pick(coloriLampi);

            // Sfarfallio veloce (1 o 2 lampeggi rapidi)
            scene.tweens.add({
                targets: flashRect,
                alpha: 0.5, // Non troppo accecante (0.5 su 1.0)
                duration: 60,
                yoyo: true,
                repeat: Phaser.Math.Between(1, 2), 
                onComplete: () => {
                    prossimoLampo(); // Prepara il prossimo!
                }
            });
        });
    }

    prossimoLampo(); // Fa partire il ciclo
}

function update() {
    if (faseVideo === 1 || faseVideo === 4 || faseVideo === 5) {
        if(faseVideo === 1) cielo.tilePositionX += 1;
        if(faseVideo === 4) skyline.tilePositionX += 2;
        if(faseVideo === 5) cielo.tilePositionX += 1;
        
        pavimento.tilePositionX += 30;
        pali.forEach(p => { p.x -= 50; if (p.x < -200) p.x = 2500 + Math.random() * 1000; });
    } else if (faseVideo === 2) {
        skyline.tilePositionX += 1; 
        pavimento.tilePositionX += 5; 
    } else if (faseVideo === 3) {
        rovine.tilePositionX += 0.5; 
    }
}
