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

// Fasi del video: 0 = In Furgone, 1 = A piedi, 2 = Rissa
let faseVideo = 0; 

const membri = ['carma', 'ferraz', 'mauri', 'nan', 'falcon'];
const cattivi = ['zombiecop', 'drogato']; 
const animazioni = ['idle', 'attack', 'walk', 'jump']; 

function preload() {
    // --- CARICAMENTO SFONDI ---
    this.load.image('cielo', 'assets/cielo.png');
    this.load.image('skyline', 'assets/skyline.png');
    this.load.image('pavimento', 'assets/pavimento.png');
    this.load.image('palo1', 'assets/palo1.png');

    // --- CARICAMENTO SPRITESHEET (Tutti griglia 5x5, 25 frame, 1280x1280) ---
    // Furga e Barili ora sono animazioni!
    this.load.spritesheet('furga_idle', 'assets/furga-idle.png', { frameWidth: 256, frameHeight: 256, endFrame: 24 });
    this.load.spritesheet('barili_idle', 'assets/barili.png', { frameWidth: 256, frameHeight: 256, endFrame: 24 });

    // Personaggi e Nemici
    [...membri, ...cattivi].forEach(char => {
        animazioni.forEach(anim => {
            // Usa un try-catch logico: se il file non esiste, Phaser mostrerà un warning ma non crasherà
            this.load.spritesheet(`${char}_${anim}`, `assets/${char}-${anim}.png`, { 
                frameWidth: 256, 
                frameHeight: 256,
                endFrame: 24
            });
        });
    });
}

function create() {
    // --- 1. SFONDI ---
    cielo = this.add.tileSprite(960, 540, 1920, 1080, 'cielo').setDepth(0);
    
    // Skyline: la mettiamo tra cielo e pavimento, ma all'inizio è invisibile
    skyline = this.add.tileSprite(960, 540, 1920, 1080, 'skyline').setDepth(1).setVisible(false);
    
    pavimento = this.add.tileSprite(960, 930, 1920, 300, 'pavimento').setDepth(2);

    // --- 2. CREAZIONE DI TUTTE LE ANIMAZIONI ---
    // Furga
    this.anims.create({
        key: 'furga_anim',
        frames: this.anims.generateFrameNumbers('furga_idle', { start: 0, end: 24 }),
        frameRate: 15, repeat: -1
    });

    // Barili
    this.anims.create({
        key: 'barili_anim',
        frames: this.anims.generateFrameNumbers('barili_idle', { start: 0, end: 24 }),
        frameRate: 12, repeat: -1
    });

    // Band e Nemici
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
    
    // Pali per la velocità della fase 1
    for(let i=0; i<2; i++) {
        pali.push(this.add.image(2000 + (i*1000), 540, 'palo1').setDepth(10).setScale(1.5));
    }

    // La Furga (Enorme, al centro, visibile subito)
    furga = this.add.sprite(960, 700, 'furga_idle').setDepth(3).setScale(3.5).play('furga_anim');

    // La Band (Nascosta, pronta per la Fase 2)
    let posizioniX = [600, 750, 900, 1050, 1200];
    membri.forEach((m, i) => {
        bandSprites[m] = this.add.sprite(posizioniX[i], 780, `${m}_walk`)
            .setDepth(4)
            .setScale(1.5)
            .setVisible(false); // Nascosti all'inizio!
    });

    // Barili e Nemici (Fuori schermo a destra, pronti per la Fase 3)
    let barile = this.add.sprite(2200, 780, 'barili_idle').setDepth(3).setScale(1.5).play('barili_anim');
    ostacoli.push(barile);

    cattivi.forEach((c, i) => {
        let n = this.add.sprite(2500 + (i * 300), 780, `${c}_walk`)
            .setDepth(4)
            .setScale(1.5);
        if (this.anims.exists(`${c}_walk_anim`)) n.play(`${c}_walk_anim`);
        nemiciSprites.push(n);
    });

    // --- LA REGIA DEI TEMPI ---

    // FASE 2: Scendono dalla Furga e camminano (Dopo 20 secondi)
    this.time.delayedCall(20000, () => {
        faseVideo = 1; // Cambia stato
        
        // Appare la skyline
        skyline.setVisible(true);
        // Nascondiamo i pali veloci
        pali.forEach(p => p.setVisible(false));

        // La Furga esce di scena andando all'indietro (a sinistra)
        this.tweens.add({
            targets: furga,
            x: -1000,
            duration: 4000,
            ease: 'Power2'
        });

        // Appaiono i regaz e iniziano a camminare
        membri.forEach(m => {
            bandSprites[m].setVisible(true);
            bandSprites[m].play(`${m}_walk_anim`);
            // Piccola animazione per farli "scendere" / apparire in posizione
            bandSprites[m].y = 700; 
            this.tweens.add({
                targets: bandSprites[m],
                y: 780,
                duration: 500,
                ease: 'Bounce.easeOut'
            });
        });
    });

    // FASE 3: Incontrano i nemici e lottano (Dopo 45 secondi totali)
    this.time.delayedCall(45000, () => {
        faseVideo = 2; // Cambia stato (fermi)

        // I regaz si fermano e si mettono in guardia (idle)
        membri.forEach(m => bandSprites[m].play(`${m}_idle_anim`));

        // Entrano in scena i barili e i cattivi
        this.tweens.add({
            targets: [...nemiciSprites, ...ostacoli],
            x: '-=1200', // Scorrono verso sinistra ed entrano nell'inquadratura
            duration: 3000,
            ease: 'Power2',
            onComplete: () => {
                // I nemici attaccano
                nemiciSprites.forEach(n => {
                    let nome = n.texture.key.split('_')[0];
                    if (this.anims.exists(`${nome}_attack_anim`)) n.play(`${nome}_attack_anim`);
                });
                // Inizia il loop della rissa
                iniziaRissa(this);
            }
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
        // Fase 1: Furga sfreccia
        cielo.tilePositionX += 1;
        pavimento.tilePositionX += 30; // Velocissimo

        pali.forEach(p => {
            p.x -= 50;
            if (p.x < -200) p.x = 2500 + Math.random() * 1000;
        });

    } else if (faseVideo === 1) {
        // Fase 2: I regaz camminano
        cielo.tilePositionX += 0.2;
        skyline.tilePositionX += 1; // Skyline scorre lenta
        pavimento.tilePositionX += 5; // Velocità di camminata
    } else if (faseVideo === 2) {
        // Fase 3: Rissa (Fermi)
        cielo.tilePositionX += 0.1; // Si muove solo il cielo lentissimo
    }
}
