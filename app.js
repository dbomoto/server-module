const express = require('express');
const app = express();
const cors = require('cors');

//Cross Origin
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({extended:true}));

//Routes
app.use("/user",require("./routes/user"));
app.use('/chatroom',require('./routes/chatroom'));


//Error Handlers
const errorHandler = require('./handlers/errorHandler');
app.use(errorHandler.notFound);
app.use(errorHandler.mongoseErrors);
if (process.env.ENV === 'DEVELOPMENT'){
    app.use(errorHandler.developmentErrors);
} else {
    app.use(errorHandler.productionErrors);
}

module.exports = app;