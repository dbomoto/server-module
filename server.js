require("dotenv").config();

const mongoose = require("mongoose");
mongoose.connect(process.env.DATABASE, {
    useUnifiedTopology: true,
    useNewUrlParser: true,
});

mongoose.connection.on('error', err => {
    console.log("Mongoose Connection Error: " + err.message);
})

mongoose.connection.once('open', ()=>{
    console.log('Database connected')
})

//Object Models
require("./models/User");
require("./models/Chatroom");
require("./models/Message");

const app = require('./app')
const server = app.listen(4000, ()=>{
    console.log("Server listening on port 4000")
})
const io = require('socket.io')(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
      }
  })
const jwt = require('jwt-then')
const Message = mongoose.model('Message')
const User = mongoose.model('User') 
const Chatroom = mongoose.model("Chatroom");

io.use(async (socket,next)=>{
    try {
        const token = socket.handshake.query.token;
        const payload = await jwt.verify(token, process.env.SECRET)
        socket.userID = payload.id;
        next()
    } catch (err) {}    
})

io.on('connection',(socket) => {
    console.log("Connected " + socket.userID)

    socket.on('disconnect',()=>{
        console.log('Disconnected:' + socket.userID)
    })

    socket.on('joinRoom', ({id})=>{
        socket.join(id),
        console.log("A user joined chatroom: " + id)
    })

    socket.on('leaveRoom', ({id})=>{
        socket.leave(id),
        console.log("A user left the chatrom: " + id)
    })

    socket.on('chatroomMessage', async ({id,message})=>{
        if (message.trim().length > 0){
            const user = await User.findOne({_id:socket.userID})
            const newMessage = new Message({
                chatroom: id,
                user: socket.userID,
                name: user.name,
                message
            })
            io.to(id).emit('newMessage',{
                message,
                name: user.name,
                userID: socket.userID
            })

            // place io.to here of updateMessage to all rooms
            const chatrooms = await Chatroom.find({});
            const roomArray = chatrooms.map((room)=>{
                return room._id.toString()
            }).filter((str)=>{
                return str !== id ? true : false;
            })

            io.to(roomArray).emit('updateMessage',{
                message,
                name: user.name,
                userID: socket.userID                    
            })


            await newMessage.save();
        }
    })

    socket.on('previousMessages', async ({id})=>{
        const history = await Message.find({chatroom:id},{_id: 0, name: 1, message: 1, user: 1})
        io.to(id).emit('loadHistory',history)
    })
})



