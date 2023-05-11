require("dotenv").config();
const flatted = require('flatted');

const mongoose = require("mongoose");
mongoose.connect(process.env.DATABASE, {
    useUnifiedTopology: true,
    useNewUrlParser: true,
});

mongoose.connection.on('error', err => {
    console.log("Mongoose Connection Error: " + err.message);
})

mongoose.connection.once('open', () => {
    console.log('Database connected')
})

//Object Models
require("./models/User");
require("./models/Chatroom");
require("./models/Message");

const app = require('./app')
const server = app.listen(4000, () => {
    console.log("Server listening on port 4000")
})
const io = require('socket.io')(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST", "DELETE"]
    }
})
const jwt = require('jwt-then')
const Message = mongoose.model('Message')
const User = mongoose.model('User')
const Chatroom = mongoose.model("Chatroom");

io.use(async (socket, next) => {
    try {
        const token = socket.handshake.query.token;
        const payload = await jwt.verify(token, process.env.SECRET)
        socket.userID = payload.id;
        next()
    } catch (err) { }
})

io.on('connection', (socket) => {
    console.log("Connected " + socket.userID)

    socket.on('disconnect', () => {
        console.log('Disconnected:' + socket.userID)
    })

    socket.on('getUsersInRoom', async ({ id }) => {
        const usersInRoom = await io.in(id).fetchSockets();
        const userList = []
        usersInRoom.forEach(element => {
            userList.push(element.userID)
        });
        const records = await User.find({ '_id': { $in: userList } }, { _id: 1, name: 1 });
        io.to(id).emit('listOfUsers', {
            users: records
        })
    })

    socket.on('joinRoom', ({ id }) => {
        socket.join(id),
            console.log("A user joined chatroom: " + id)
    })

    socket.on('leaveRoom', async ({ id }) => {
        socket.leave(id),
            console.log("A user left the chatrom: " + id)

        const usersInRoom = await io.in(id).fetchSockets();
        const userList = []
        usersInRoom.forEach(element => {
            userList.push(element.userID)
        });
        const records = await User.find({ '_id': { $in: userList } }, { _id: 1, name: 1 });
        io.to(id).emit('listOfUsers', {
            users: records
        })
    })

    socket.on('chatroomMessage', async ({ id, message, roomName }) => {
        if (message.trim().length > 0) {
            const user = await User.findOne({ _id: socket.userID })
            const newMessage = new Message({
                chatroom: id,
                user: socket.userID,
                name: user.name,
                message
            })
            io.to(id).emit('newMessage', {
                message,
                name: user.name,
                userID: user._id.toString()
            })

            io.to('dashboard').emit('updateMessage', {
                roomName,
                name: user.name,
            })


            await newMessage.save();
        }
    })

    socket.on('previousMessages', async ({ id }) => {
        const history = await Message.find({ chatroom: id }, { _id: 0, name: 1, message: 1, user: 1 })
        io.to(id).emit('loadHistory', history)
    })
})



