const config = {
    type: Phaser.AUTO,
    width: 1920,
    height: 1080,
    scene: { preload: preload, create: create, update: update }
};

const game = new Phaser.Game(config);

// Variabili globali
let cielo, skyline, rovine, pavimento, furgone;
let pali = [], ostacoli = [], nemiciSprites = [];
let bandSprites = {}; 
let isMoving = true;
const durataViaggio = 10000; 

const membri = ['carma', 'ferraz', 'mauri', 'nan', 'falcon'];
const cattivi = ['zombiecop', 'drogato']; 
const animazioni = ['idle', 'attack', 'walk', 'jump']; 

function preload() {
    // --- CARICAMENTO SFONDI (Dimensioni suggerite integrate) ---
    this.load.image('cielo', 'assets/cielo.png');           // 1920 x 1080
    this.load.image('skyline', 'assets/skyline.png');       // 3840 x 540
    this.load.image('rovine', 'assets/rovine.png');         // 5760 x 600
    this.load.image('pavimento', 'assets/pavimento.png');   // 7680 x 300
    
    // --- CARICAMENTO PROPS ---
    this.load.image('furgone', 'assets/furgone.png');       // 1024 x 640
    this.load.image('palo1', 'assets/palo1.png');           // 100 x 800
    this.load.image('barili', 'assets/barili.png');         // 256 x 256

    // --- CARICAMENTO SPRITESHEET (Griglia 5x5, 1280 totali) ---
    [...membri, ...cattivi].forEach(char => {
        animazioni.forEach(anim => {
            this.load.spritesheet(`${char}_${anim}`, `assets/${char}-${anim}.png`, { 
                frameWidth: 256, 
                frameHeight: 256,
                endFrame: 24 // I tuoi 25 elementi (0-24)
            });
        });
    });
}

function create() {
    // 1. SFONDI (Posizionati in base alle altezze suggerite)
    // Cielo: statico o quasi
    cielo = this.add.tileSprite(960, 540, 1920, 1080, 'cielo').setDepth(0);
    
    // Skyline: a metà schermo (altezza 540)
    skyline = this.add.tileSprite(960, 400, 1920, 540, 'skyline').setDepth(1);
    
    // Rovine: più larghe e basse (altezza 600)
    rovine = this.add.tileSprite(960, 500, 1920, 600, 'rovine').setDepth(2).setVisible(false);
    
    // Pavimento: in fondo (altezza 300)
    pavimento = this.add.tileSprite(960, 930, 1920, 300, 'pavimento').setDepth(3);

    // 2. IL FURGONE (Dimensioni 1024x640)
    // Lo posizioniamo in modo che le ruote tocchino il pavimento
    furgone = this.add.image(960, 800, 'furgone').setDepth(4).setScale(1.1);

    // 3. CREAZIONE ANIMAZIONI
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

    // 4. POSIZIONAMENTO BAND SUL FURGONE
    // Distribuiamo i 5 membri sul tetto (1024px di larghezza del furgone)
    let posizioniX = [750, 850, 960, 1070, 1170];
    membri.forEach((m, i) => {
        bandSprites[m] = this.add.sprite(posizioniX[i], 650, `${m}_idle`)
            .setDepth(5)
            .setScale(1.2) // Li ingrandiamo un po' per farli vedere bene
            .play(`${m}_idle_anim`);
    });

    // 5. PALI DELLA LUCE (Effetto velocità estrema)
    for(let i=0; i<2; i++) {
        let p = this.add.image(2000 + (i*1500), 540, 'palo1').setDepth(10).setScale(1.5);
        pali.push(p);
    }

    // 6. NEMICI E OSTACOLI (Nascosti a destra)
    let barile = this.add.image(2800, 900, 'barili').setDepth(4).setScale(1.2);
    ostacoli.push(barile);

    cattivi.forEach((c, i) => {
        let n = this.add.sprite(3000 + (i * 400), 850, `${c}_walk`)
            .setDepth(5)
            .setScale(1.3);
        if (this.anims.exists(`${c}_walk_anim`)) n.play(`${c}_walk_anim`);
        nemiciSprites.push(n);
    });

    // --- REGIA: IL CAMBIO SCENA ---
    this.time.delayedCall(durataViaggio, () => {
        isMoving = false;
        skyline.setVisible(false);
        rovine.setVisible(true);
        pali.forEach(p => p.alpha = 0); // Spariscono i pali

        // Entrano nemici e ostacoli
        this.tweens.add({
            targets: [...nemiciSprites, ...ostacoli],
            x: '-=1500',
            duration: 2000,
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
    if (isMoving) {
        // Velocità differenziate per il Parallax
        cielo.tilePositionX += 0.5;
        skyline.tilePositionX += 2;
        pavimento.tilePositionX += 25;

        // Movimento pali
        pali.forEach(p => {
            p.x -= 40;
            if (p.x < -200) p.x = 2500;
        });

        // Sobbalzo furgone (per dare vita)
        furgone.y = 800 + Math.sin(this.time.now / 100) * 3;
        // Anche i membri della band devono sobbalzare col furgone
        Object.values(bandSprites).forEach(s => s.y = 650 + Math.sin(this.time.now / 100) * 3);

    } else {
        // Da fermi scorre solo il cielo e le rovine lentissime
        cielo.tilePositionX += 0.2;
        rovine.tilePositionX += 1;
    }
}
