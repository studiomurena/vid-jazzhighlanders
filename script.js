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
let furgone;
let pali = []; 
let ostacoli = []; 
let nemiciSprites = []; // Array per i cattivi
let bandSprites = {}; 
let isMoving = true;

// --- CONFIGURAZIONE REGIA ---
// Qui decidi quanto dura il viaggio in furgone prima della battaglia (in millisecondi)
// 10000 = 10 secondi. Per farlo durare di più, basta alzare questo numero!
const durataViaggio = 10000; 

// Liste personaggi e animazioni
const membri = ['carma', 'ferraz', 'mauri', 'nan', 'falcon'];
const cattivi = ['zombiecop', 'drogato']; 
// Assicurati di avere i file tipo "zombiecop-walk.png", "zombiecop-attack.png", ecc.
const animazioni = ['idle', 'attack', 'wave', 'jump', 'walk']; 

function preload() {
    // Sfondi
    this.load.image('cielo', 'assets/cielo.png');
    this.load.image('skyline', 'assets/skyline.png');
    this.load.image('rovine', 'assets/rovine.png');
    this.load.image('pavimento', 'assets/pavimento.png');
    
    // Attenzione al nome! Nel tuo codice c'era 'furga' e 'furgone'. Uso furgone per coerenza.
    this.load.image('furgone', 'assets/furgone.png');

    // Props
    this.load.image('barili', 'assets/barili.png');
    this.load.image('gommoni', 'assets/gommoni.png');
    this.load.image('palo1', 'assets/palo1.png');
    this.load.image('palo2', 'assets/palo2.png');

    // Caricamento automatico Band
    membri.forEach(membro => {
        animazioni.forEach(anim => {
            this.load.spritesheet(`${membro}_${anim}`, `assets/${membro}-${anim}.png`, { 
                frameWidth: 256, frameHeight: 256 
            });
        });
    });

    // Caricamento automatico Cattivi
    cattivi.forEach(cattivo => {
        animazioni.forEach(anim => {
            // Se non hai tutte le animazioni per i cattivi (es. wave), il browser darà un piccolo errore in console ma andrà avanti. 
            // L'ideale è avere almeno walk, attack e idle per loro.
            this.load.spritesheet(`${cattivo}_${anim}`, `assets/${cattivo}-${anim}.png`, { 
                frameWidth: 256, frameHeight: 256 
            });
        });
    });
}

function create() {
    // 1. SFONDI (Uso setDepth per i livelli di profondità: 0 è in fondo, 10 è in primissimo piano)
    cielo = this.add.tileSprite(960, 540, 1920, 1080, 'cielo').setDepth(0);
    
    skyline = this.add.tileSprite(960, 540, 3840, 1080, 'skyline').setDepth(1);
    
    // Le rovine le carichiamo ma le teniamo invisibili all'inizio
    rovine = this.add.tileSprite(960, 540, 5760, 1080, 'rovine').setDepth(1);
    rovine.setVisible(false); 
    
    pavimento = this.add.tileSprite(960, 930, 7680, 300, 'pavimento').setDepth(2);

    // 2. PROPS IN MOVIMENTO
    let paloA = this.add.image(2000, 700, 'palo1').setDepth(5);
    let paloB = this.add.image(3500, 700, 'palo2').setDepth(5);
    pali.push(paloA, paloB);

    // 3. IL FURGONE
    furgone = this.add.image(960, 800, 'furgone').setDepth(3);

    // 4. CREAZIONE ANIMAZIONI (Per tutti: buoni e cattivi)
    [...membri, ...cattivi].forEach(personaggio => {
        animazioni.forEach(anim => {
            let frames = this.anims.generateFrameNumbers(`${personaggio}_${anim}`);
            if (frames) { // Crea l'animazione solo se il file esiste
                this.anims.create({
                    key: `${personaggio}_${anim}_anim`,
                    frames: frames,
                    frameRate: 10,
                    repeat: (anim === 'attack' || anim === 'jump' || anim === 'hurt') ? 0 : -1 
                });
            }
        });
    });

    // 5. PIAZZARE LA BAND SUL FURGONE (Tutti in IDLE)
    bandSprites['carma'] = this.add.sprite(750, 600, 'carma_idle').setDepth(4).play('carma_idle_anim');
    bandSprites['ferraz'] = this.add.sprite(850, 580, 'ferraz_idle').setDepth(4).play('ferraz_idle_anim');
    bandSprites['mauri'] = this.add.sprite(950, 610, 'mauri_idle').setDepth(4).play('mauri_idle_anim');
    bandSprites['nan'] = this.add.sprite(1050, 570, 'nan_idle').setDepth(4).play('nan_idle_anim');
    bandSprites['falcon'] = this.add.sprite(1150, 600, 'falcon_idle').setDepth(4).play('falcon_idle_anim');

    // 6. PREPARARE BARRICATE E NEMICI (Fuori schermo a destra)
    let barricataBarili = this.add.image(2200, 900, 'barili').setDepth(3);
    let barricataGommoni = this.add.image(2400, 900, 'gommoni').setDepth(3);
    ostacoli.push(barricataBarili, barricataGommoni);

    // Creiamo i nemici ma li teniamo fuori schermo
    let zombie = this.add.sprite(2300, 850, 'zombiecop_walk').setDepth(4).play('zombiecop_walk_anim');
    let drogato = this.add.sprite(2500, 850, 'drogato_walk').setDepth(4).play('drogato_walk_anim');
    nemiciSprites.push(zombie, drogato);

    // --- LA REGIA: IL CAMBIO DI SCENA ---
    this.time.delayedCall(durataViaggio, () => {
        isMoving = false; // Frena il furgone

        // Cambiamo lo sfondo! Via la skyline, dentro le rovine
        skyline.setVisible(false);
        rovine.setVisible(true);

        pali.forEach(p => p.setVisible(false)); 

        // Facciamo scivolare gli ostacoli in scena
        this.tweens.add({
            targets: ostacoli,
            x: '-=1000', 
            duration: 1000,
            ease: 'Power2'
        });

        // Facciamo camminare i nemici in scena
        this.tweens.add({
            targets: nemiciSprites,
            x: '-=1000', 
            duration: 2000, // Ci mettono un po' di più ad arrivare
            ease: 'Linear',
            onComplete: () => {
                // I nemici sono arrivati e iniziano ad attaccare
                nemiciSprites.forEach(n => {
                    // Supponiamo che il nome del personaggio sia la prima parte della texture ('zombiecop_walk' -> 'zombiecop')
                    let nomeCattivo = n.texture.key.split('_')[0];
                    n.play(`${nomeCattivo}_attack_anim`);
                });

                // Inizia la rissa continua per riempire i 3 minuti di video
                iniziaRissaContinua(this);
            }
        });
    });
}

// Funzione extra per tenere viva l'azione per tutto il tempo di registrazione
function iniziaRissaContinua(scene) {
    // Ogni 2 secondi facciamo fare un'azione random alla band e ai nemici
    scene.time.addEvent({
        delay: 2000,
        callback: () => {
            membri.forEach(membro => {
                // Scegli a caso tra attack o jump per fare scena
                let mossa = Math.random() > 0.5 ? 'attack' : 'jump';
                bandSprites[membro].play(`${membro}_${mossa}_anim`);
                
                // Dopo che l'animazione finisce, tornano in idle
                bandSprites[membro].once('animationcomplete', () => {
                    bandSprites[membro].play(`${membro}_idle_anim`);
                });
            });

            nemiciSprites.forEach(nemico => {
                let nomeCattivo = nemico.texture.key.split('_')[0];
                nemico.play(`${nomeCattivo}_attack_anim`);
                nemico.once('animationcomplete', () => {
                    nemico.play(`${nomeCattivo}_idle_anim`);
                });
            });
        },
        loop: true // Continua all'infinito!
    });
}

function update() {
    if (isMoving) {
        // Movimento scena iniziale
        skyline.tilePositionX += 1.5;   
        pavimento.tilePositionX += 20; 

        pali.forEach(palo => {
            palo.x -= 25; 
            if (palo.x < -200) {
                palo.x = 2000 + Math.random() * 1000; 
            }
        });
    } else {
        // Quando sono fermi in battaglia, magari il cielo scorre lentissimo per dare atmosfera
        cielo.tilePositionX += 0.2;
    }
}
