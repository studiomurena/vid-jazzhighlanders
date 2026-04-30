const config = {
    type: Phaser.AUTO,
    width: 1920,
    height: 1080,
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

// Variabili globali
let cielo, skyline, rovine, pavimento;
let furga;
let pali = []; // Un array per gestire i pali che scorrono
let ostacoli = []; // Per i barili e gommoni
let bandSprites = {}; // Qui salveremo i personaggi sul tetto
let isMoving = true;

// I membri del gruppo e le animazioni che ci servono per questa scena
const membri = ['carma', 'ferraz', 'mauri', 'nan', 'falcon'];
const animazioni = ['idle', 'attack', 'wave', 'jump'];

function preload() {
    // Sfondi
    this.load.image('cielo', 'assets/cielo.png');
    this.load.image('skyline', 'assets/skyline.png');
    this.load.image('rovine', 'assets/rovine.png');
    this.load.image('pavimento', 'assets/pavimento.png');
    this.load.image('furga', 'assets/furga-idle.png');

    // Nuovi Props
    this.load.image('barili', 'assets/barili.png');
    this.load.image('gommoni', 'assets/gommoni.png');
    this.load.image('palo1', 'assets/palo1.png');
    this.load.image('palo2', 'assets/palo2.png');

    // Ciclo magico per caricare in automatico tutte le animazioni dei 5 membri!
    // Nota: devi avere i file nominati esattamente, es: assets/carma-idle.png
    membri.forEach(membro => {
        animazioni.forEach(anim => {
            this.load.spritesheet(`${membro}_${anim}`, `assets/${membro}-${anim}.png`, { 
                frameWidth: 256, 
                frameHeight: 256 
            });
        });
    });
}

function create() {
    // 1. SFONDI (Parallasse)
    cielo = this.add.tileSprite(960, 540, 1920, 1080, 'cielo');
    skyline = this.add.tileSprite(960, 540, 3840, 1080, 'skyline');
    rovine = this.add.tileSprite(960, 780, 5760, 600, 'rovine');
    pavimento = this.add.tileSprite(960, 930, 7680, 300, 'pavimento');

    // 2. PROPS IN MOVIMENTO (Pali che sfrecciano)
    // Li piazziamo fuori dallo schermo a destra all'inizio
    let paloA = this.add.image(2000, 700, 'palo1');
    let paloB = this.add.image(3500, 700, 'palo2');
    pali.push(paloA, paloB);

    // 3. IL FURGONE
    furgone = this.add.image(960, 800, 'furgone');

    // 4. CREAZIONE ANIMAZIONI PER TUTTI I MEMBRI
    membri.forEach(membro => {
        // Creiamo la configurazione per ogni azione
        animazioni.forEach(anim => {
            let frames = this.anims.generateFrameNumbers(`${membro}_${anim}`);
            
            this.anims.create({
                key: `${membro}_${anim}_anim`,
                frames: frames,
                frameRate: 10,
                repeat: (anim === 'attack' || anim === 'jump') ? 0 : -1 // attack e jump non loopano
            });
        });
    });

    // 5. PIAZZARE LA BAND SUL FURGONE
    // Ho dato a ciascuno una coordinata X e Y diversa per sparpagliarli sul tetto
    bandSprites['carma'] = this.add.sprite(750, 600, 'carma_wave').play('carma_wave_anim');
    bandSprites['ferraz'] = this.add.sprite(850, 580, 'ferraz_idle').play('ferraz_idle_anim');
    bandSprites['mauri'] = this.add.sprite(950, 610, 'mauri_wave').play('mauri_wave_anim');
    bandSprites['nan'] = this.add.sprite(1050, 570, 'nan_idle').play('nan_idle_anim');
    bandSprites['falcon'] = this.add.sprite(1150, 600, 'falcon_wave').play('falcon_wave_anim');

    // 6. PREPARARE LA BARRICATA (Inizialmente fuori schermo a destra)
    let barricataBarili = this.add.image(2400, 900, 'barili');
    let barricataGommoni = this.add.image(2600, 900, 'gommoni');
    ostacoli.push(barricataBarili, barricataGommoni);

    // --- LA REGIA: IL CAMBIO DI SCENA ---
    // Dopo 6 secondi di corsa, il furgone "frena" (la telecamera si ferma)
    this.time.delayedCall(6000, () => {
        isMoving = false; // Stoppa gli sfondi e i pali nell'update

        // I pali spariscono per fare pulizia a schermo
        pali.forEach(p => p.setVisible(false)); 

        // Facciamo scivolare i barili e i gommoni in scena da destra verso sinistra (animazione Tween)
        this.tweens.add({
            targets: ostacoli,
            x: '-=1000', // Si spostano di 1000 pixel a sinistra
            duration: 1000, // In 1 secondo
            ease: 'Power2',
            onComplete: () => {
                // Quando la barricata è ferma davanti al furgone, la band attacca!
                bandSprites['carma'].play('carma_attack_anim');
                bandSprites['ferraz'].play('ferraz_jump_anim'); // magari lui salta
                bandSprites['mauri'].play('mauri_attack_anim');
                bandSprites['nan'].play('nan_attack_anim');
                bandSprites['falcon'].play('falcon_jump_anim');
            }
        });
    });
}

function update() {
    if (isMoving) {
        // Il Parallasse degli sfondi
        skyline.tilePositionX += 1.5;   
        rovine.tilePositionX += 4;    
        pavimento.tilePositionX += 20; // Velocissimo

        // I pali sfrecciano via verso sinistra
        pali.forEach(palo => {
            palo.x -= 25; // Velocità dei pali
            // Se escono dallo schermo a sinistra, li rimettiamo a destra per il loop
            if (palo.x < -200) {
                palo.x = 2000 + Math.random() * 1000; // Ricompaiono a distanza random
            }
        });
    }
}
