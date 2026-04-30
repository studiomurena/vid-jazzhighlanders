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
const cattivi = ['copzombie', 'drogato']; 
// Ho controllato la tua lista: queste 4 animazioni le hanno tutti!
const animazioni = ['idle', 'attack', 'walk', 'jump']; 

function preload() {
    // --- CARICAMENTO SFONDI E PROPS ---
    this.load.image('cielo', 'assets/cielo.png');
    this.load.image('skyline', 'assets/skyline.png');
    this.load.image('pavimento', 'assets/pavimento.png');
    
    // Possiamo caricare entrambi i pali se vuoi variare
    this.load.image('palo1', 'assets/palo1.png');
    this.load.image('palo2', 'assets/palo2.png');

    // --- CARICAMENTO SPRITESHEET (Tutti griglia 5x5, 25 frame, 1280x1280) ---
    
    // MISTERO RISOLTO: Usiamo furga-run.png perché furga-idle non ce l'hai!
    this.load.spritesheet('furga_run', 'assets/furga-run.png', { frameWidth: 256, frameHeight: 256, endFrame: 24 });
    
    // I barili animati
    this.load.spritesheet('barili_animati', 'assets/barili.png', { frameWidth: 256, frameHeight: 256, endFrame: 24 });

    // Personaggi e Nemici
    [...membri, ...cattivi].forEach(char => {
        animazioni.forEach(anim => {
            // Il nome del file combacia perfettamente con la tua lista (es: carma-walk.png)
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
    
    // Skyline: all'inizio invisibile
    skyline = this.add.tileSprite(960, 540, 1920, 1080, 'skyline').setDepth(1).setVisible(false);
    
    pavimento = this.add.tileSprite(960, 930, 1920, 300, 'pavimento').setDepth(2);

    // --- 2. CREAZIONE DI TUTTE LE ANIMAZIONI ---
    // Animazione Furga in corsa
    this.anims.create({
        key: 'furga_corsa',
        frames: this.anims.generateFrameNumbers('furga_run', { start: 0, end: 24 }),
        frameRate: 20, // Bel po' veloce per dare l'idea del movimento
        repeat: -1
    });

    // Animazione Barili
    this.anims.create({
        key: 'barili_fuoco',
        frames: this.anims.generateFrameNumbers('barili_animati', { start: 0, end: 24 }),
        frameRate: 12, 
        repeat: -1
    });

    // Band e Nemici
    [...membri, ...cattivi].forEach(char => {
        animazioni.forEach(anim => {
            if (this.textures.exists(`${char}_${anim}`)) {
                this.anims.create({
                    key: `${char}_${anim}_anim`,
                    frames: this.anims.generateFrameNumbers(`${char}_${anim}`, { start: 0, end: 24 }),
                    frameRate: 12, 
                    repeat: -1
                });
            }
        });
    });

    // --- 3. INSERIMENTO ELEMENTI IN SCENA ---
    
    // Pali per la velocità della fase 1 (Alterno palo1 e palo2)
    pali.push(this.add.image(2000, 540, 'palo1').setDepth(10).setScale(1.5));
    pali.push(this.add.image(3000, 540, 'palo2').setDepth(10).setScale(1.5));

    // La Furga (Enorme, al centro, visibile subito)
    furga = this.add.sprite(960, 700, 'furga_run').setDepth(3).setScale(3.5).play('furga_corsa');

    // La Band (Nascosta, pronta per la Fase 2)
    let posizioniX = [600, 750, 900, 1050, 1200];
    membri.forEach((m, i) => {
        bandSprites[m] = this.add.sprite(posizioniX[i], 780, `${m}_walk`)
            .setDepth(4)
            .setScale(1.5)
            .setVisible(false);
    });

    // Barili e Nemici (Fuori schermo a destra)
    let barile = this.add.sprite(2200, 780, 'barili_animati').setDepth(3).setScale(1.5).play('barili_fuoco');
    ostacoli.push(barile);

    cattivi.forEach((c, i) => {
        let n = this.add.sprite(2500 + (i * 300), 780, `${c}_walk`)
            .setDepth(4)
            .setScale(1.5);
        if (this.anims.exists(`${c}_walk_anim`)) n.play(`${c}_walk_anim`);
        nemiciSprites.push(n);
    });

    // --- LA REGIA DEI TEMPI ---

    // FASE 2: Scendono dalla Furga e camminano (Dopo 20 secondi / 20000ms)
    this.time.delayedCall(20000, () => {
        faseVideo = 1; 
        
        skyline.setVisible(true);
        pali.forEach(p => p.setVisible(false));

        // La Furga esce di scena
        this.tweens.add({
            targets: furga,
            x: -1000,
            duration: 4000,
            ease: 'Power2'
        });

        // Appaiono i regaz che camminano
        membri.forEach(m => {
            bandSprites[m].setVisible(true);
            bandSprites[m].play(`${m}_walk_anim`);
            bandSprites[m].y = 700; 
            this.tweens.add({
                targets: bandSprites[m],
                y: 780,
                duration: 500,
                ease: 'Bounce.easeOut'
            });
        });
    });

    // FASE 3: Rissa! (Dopo 45 secondi totali / 45000ms)
    this.time.delayedCall(45000, () => {
        faseVideo = 2; 

        // I regaz si fermano e si mettono in idle
        membri.forEach(m => bandSprites[m].play(`${m}_idle_anim`));

        // Entrano i nemici e i barili
        this.tweens.add({
            targets: [...nemiciSprites, ...ostacoli],
            x: '-=1200',
            duration: 3000,
            ease: 'Power2',
            onComplete: () => {
                nemiciSprites.forEach(n => {
                    let nome = n.texture.key.split('_')[0];
                    if (this.anims.exists(`${nome}_attack_anim`)) n.play(`${nome}_attack_anim`);
                });
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
        cielo.tilePositionX += 1;
        pavimento.tilePositionX += 30; // Velocissimo

        pali.forEach(p => {
            p.x -= 50;
            if (p.x < -200) p.x = 2500 + Math.random() * 1000;
        });

    } else if (faseVideo === 1) {
        cielo.tilePositionX += 0.2;
        skyline.tilePositionX += 1; 
        pavimento.tilePositionX += 5; // A piedi è più lento
    } else if (faseVideo === 2) {
        cielo.tilePositionX += 0.1; 
    }
}
