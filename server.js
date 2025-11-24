const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

const io = new Server(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

// --- CONFIGURACIÓN INICIAL ---
const STARTING_GOLD = 1000;
const STARTING_TROOPS = 0;

// Catálogo completo de Héroes (9 opciones)
const HERO_CATALOG = [
    { id: 'h_napoleon', name: "Napoleón Bonaparte", avatar: "NB", color: "border-blue-600", bg: "bg-blue-900", gold: STARTING_GOLD, troops: STARTING_TROOPS },
    { id: 'h_cleopatra', name: "Cleopatra VII", avatar: "CV", color: "border-yellow-500", bg: "bg-yellow-900", gold: STARTING_GOLD, troops: STARTING_TROOPS },
    { id: 'h_genghis', name: "Genghis Khan", avatar: "GK", color: "border-red-600", bg: "bg-red-900", gold: STARTING_GOLD, troops: STARTING_TROOPS },
    { id: 'h_lubu', name: "Lu Bu", avatar: "LB", color: "border-purple-600", bg: "bg-purple-900", gold: STARTING_GOLD, troops: STARTING_TROOPS },
    { id: 'h_alexander', name: "Alejandro Magno", avatar: "AM", color: "border-orange-500", bg: "bg-orange-800", gold: STARTING_GOLD, troops: STARTING_TROOPS },
    { id: 'h_suntzu', name: "Sun Tzu", avatar: "ST", color: "border-green-600", bg: "bg-green-900", gold: STARTING_GOLD, troops: STARTING_TROOPS },
    { id: 'h_joan', name: "Juana de Arco", avatar: "JA", color: "border-indigo-400", bg: "bg-indigo-900", gold: STARTING_GOLD, troops: STARTING_TROOPS },
    { id: 'h_mansa', name: "Mansa Musa", avatar: "MM", color: "border-yellow-300", bg: "bg-yellow-800", gold: STARTING_GOLD, troops: STARTING_TROOPS },
    { id: 'h_leonardo', name: "Leonardo da Vinci", avatar: "LD", color: "border-amber-700", bg: "bg-amber-950", gold: STARTING_GOLD, troops: STARTING_TROOPS },
    { id: 'h_elizabeth', name: "Isabel I", avatar: "EI", color: "border-rose-400", bg: "bg-rose-900", gold: STARTING_GOLD, troops: STARTING_TROOPS }
];

let gameState = {
    players: {}, 
    turnOrder: [], 
    currentTurnIndex: 0,
    round: 1,
};

// Helper: Elegir personaje aleatorio disponible
function getRandomAvailableHero(currentPlayers) {
    // Obtener IDs de héroes ya usados
    const usedHeroIds = Object.values(currentPlayers).map(p => p.id);
    
    // Filtrar catálogo para dejar solo los libres
    const availableHeroes = HERO_CATALOG.filter(hero => !usedHeroIds.includes(hero.id));
    
    if (availableHeroes.length === 0) return null;

    // Elegir uno al azar
    const randomIndex = Math.floor(Math.random() * availableHeroes.length);
    return availableHeroes[randomIndex];
}

io.on('connection', (socket) => {
    console.log(`Jugador conectado: ${socket.id}`);

    const currentPlayersCount = Object.keys(gameState.players).length;
    
    if (currentPlayersCount < 4) {
        // ASIGNACIÓN ALEATORIA
        const assignedHero = getRandomAvailableHero(gameState.players);
        
        if (assignedHero) {
            gameState.players[socket.id] = {
                ...assignedHero,
                socketId: socket.id,
                buildings: [] 
            };
            gameState.turnOrder.push(socket.id);

            console.log(`Asignado ${assignedHero.name} a ${socket.id}`);
            socket.emit('init_player', gameState.players[socket.id]);
        } else {
            socket.emit('game_full', { message: "Error: No quedan héroes disponibles." });
            return;
        }
    } else {
        socket.emit('game_full', { message: "La partida está llena (4/4)" });
        return; 
    }

    io.emit('game_state_update', cleanGameState());

    socket.on('end_turn', (data) => {
        const currentTurnId = gameState.turnOrder[gameState.currentTurnIndex];
        if (socket.id !== currentTurnId) return;

        if (data.updatedPlayer) {
            gameState.players[socket.id] = {
                ...gameState.players[socket.id],
                gold: data.updatedPlayer.gold,
                troops: data.updatedPlayer.troops,
                buildings: data.updatedPlayer.buildings
            };
        }

        let nextIndex = gameState.currentTurnIndex + 1;
        if (nextIndex >= gameState.turnOrder.length) {
            nextIndex = 0;
            gameState.round++; 
        }
        gameState.currentTurnIndex = nextIndex;

        io.emit('game_state_update', cleanGameState());
    });

    socket.on('disconnect', () => {
        console.log(`Jugador desconectado: ${socket.id}`);
        delete gameState.players[socket.id];
        gameState.turnOrder = gameState.turnOrder.filter(id => id !== socket.id);
        if (gameState.currentTurnIndex >= gameState.turnOrder.length) {
            gameState.currentTurnIndex = 0;
        }
        io.emit('game_state_update', cleanGameState());
    });
});

function cleanGameState() {
    return {
        players: Object.values(gameState.players),
        currentTurnId: gameState.turnOrder[gameState.currentTurnIndex],
        round: gameState.round
    };
}

server.listen(PORT, () => {
    console.log(`⚔️ Servidor Hegemonía (Aleatorio) corriendo en puerto ${PORT}`);
});