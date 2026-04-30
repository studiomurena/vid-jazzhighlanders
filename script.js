// Configurazione base di Phaser
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

// Variabili globali che ci serviranno
let cielo, skyline, rovine, pavimento;
let furgone;
let isMoving = true; // Una variabile per dire se stiamo correndo o siamo fermi a combattere

// 1. PRELOAD: Carichiamo tutte le immagini in memoria
function preload() {
    this.load.image('cielo', 'assets/cielo.png');
    this.load.image('skyline', 'assets/skyline.png');
    this.load.image('rovine', 'assets/rovine.png');
    this.load.image('pavimento', 'assets/pavimento.png');
    this.load.image('furgone', 'assets/furgone.png');
    
    // Per i personaggi usiamo spritesheet (diciamo a Phaser che ogni frame è 256x256)
    this.load.spritesheet('carma', 'assets/carma.png', { frameWidth: 256, frameHeight: 256 });
    // Fai lo stesso per ferraz, mauri, nan, falcon, zombiecop...
}

// 2. CREATE: Posizioniamo gli elementi sullo schermo
function create() {
    // Aggiungiamo gli sfondi a scorrimento (TileSprite). 
    // I numeri sono: X (centro), Y (centro), Larghezza, Altezza, Nome Asset
    cielo = this.add.tileSprite(960, 540, 1920, 1080, 'cielo');
    skyline = this.add.tileSprite(960, 540, 3840, 1080, 'skyline'); // Abbassalo cambiando Y se serve
    rovine = this.add.tileSprite(960, 780, 5760, 600, 'rovine');
    pavimento = this.add.tileSprite(960, 930, 7680, 300, 'pavimento');

    // Aggiungiamo il furgone
    furgone = this.add.image(960, 800, 'furgone');

    // Creiamo le animazioni dei personaggi (esempio base per Carma)
    this.anims.create({
        key: 'carma_idle',
        frames: this.anims.generateFrameNumbers('carma', { start: 0, end: 3 }), // metti i frame corretti del tuo file
        frameRate: 8,
        repeat: -1 // -1 significa che va in loop all'infinito
    });

    this.anims.create({
        key: 'carma_attack',
        frames: this.anims.generateFrameNumbers('carma', { start: 4, end: 7 }), // frame dell'attacco
        frameRate: 12,
        repeat: 0 // Lo fa una volta sola, oppure mettilo a loop (-1) se vuoi che continui a menare
    });

    // Aggiungiamo Carma sul furgone e facciamo partire l'animazione idle
    this.carmaSprite = this.add.sprite(960, 600, 'carma').play('carma_idle');
    // Fai lo stesso per gli altri membri, spostando la X e la Y per sistemarli sul tetto!

    // --- LA REGIA ---
    // Usiamo un timer: dopo 5000 millisecondi (5 secondi), fermiamo il furgone e scatta l'attacco
    this.time.delayedCall(5000, () => {
        isMoving = false; // Ferma il movimento in Update()
        this.carmaSprite.play('carma_attack'); // Cambia animazione
        // Qui poi potrai far apparire gli Zombiecop!
    });
}

// 3. UPDATE: Viene eseguito 60 volte al secondo (è il motore del movimento)
function update() {
    if (isMoving) {
        // Facciamo scorrere gli sfondi a velocità diverse per creare il parallasse (la profondità)
        // Il cielo non si muove (o si muove quasi a 0)
        skyline.tilePositionX += 1;   // Scorre lentamente
        rovine.tilePositionX += 3;    // Scorre medio
        pavimento.tilePositionX += 15; // Scorre velocissimo sotto le ruote
    }
}
