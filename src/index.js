const express = require('express')
const http = require('http')
const path = require('path')
const socketio = require('socket.io')
const { generateMessage, generateLocationMessage } = require('./utils/messages')
const { addUser, removeUser, getUser, getUsersinRoom } = require('./utils/users')

const app = express()
const server = http.createServer(app)
const io = socketio(server)

const PORT = process.env.PORT || 3000
const publicDirectorypath = path.join(__dirname, '../public')

app.use(express.static(publicDirectorypath))

let count = 0

io.on('connection', (socket) => {
    console.log('New Websocket connection')

    socket.on('Join', ({ username, room }, callback) => {
        const { error, user } = addUser({ id: socket.id, username, room })

        if(error) {
            return callback(error)
        }

        socket.join(user.room)

        socket.emit('message', generateMessage(`Welcome ${user.username}!`))
        socket.broadcast.to(user.room).emit('message', generateMessage(`${user.username} has joined!`))
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersinRoom(user.room)
        })

        callback()
    })

    socket.on('SendMessage', (message, callback) => {
        const user= getUser(socket.id)

        if(user) {
            io.to(user.room).emit('message', generateMessage(user.username, message))
            callback()
        }
    })

    socket.on('LocationCoordinates', ({latitude, longitude}, callback) => {
        const user = getUser(socket.id)

        if(user) {
        io.to(user.room).emit('ShareLocation', generateLocationMessage(user.username, `https://google.com/maps?q=${latitude},${longitude}`))
        callback()
        }
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if(user) {
            io.to(user.room).emit('message', generateMessage(`${user.username} has left!`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersinRoom(user.room)
            })
        }
    })
})

server.listen(PORT, () => {
    console.log('Server up and running on ' + PORT)
})