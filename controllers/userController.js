const mongoose = require("mongoose");
const User = mongoose.model("User");
const sha256 = require('js-sha256');
const jwt = require('jwt-then');

exports.register = async (req, res) => {
    const { name, email, password } = req.body;

    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/ig

    if (!emailRegex.test(email)) throw "Email address not supported or invalid."
    if (password.length < 6) throw "Password must be at least 6 characters long."

    const userExists = await User.findOne({
        email,
    })

    if (userExists) throw "Email with same email already exists"

    const user = new User({
        name,
        email,
        password: sha256(password + process.env.SALT)
    })

    await user.save();

    res.json({
        message: `User ${name} registered successfully.`
    })
}
exports.login = async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({
        email,
        password: sha256(password + process.env.SALT)
    })

    if (!user) throw "Email or password did not match.";
    const token = await jwt.sign({ id: user.id }, process.env.SECRET);

    res.json({
        message: "User logged in successfully.",
        token,
    });
}

exports.getInfo = async (req, res) => {
    const token = req.headers.authorization.split(" ")[1];
    const decoded = await jwt.verify(token, process.env.SECRET)

    const user = await User.findOne({ _id: decoded.id }, { name: 1, email: 1, contacts: 1 }).populate({
        path: 'contacts',
        select: '_id name email'
    })
    res.json(user)
}

exports.removeContact = async(req,res) => {
    const token = req.headers.authorization.split(" ")[1];
    const decoded = await jwt.verify(token, process.env.SECRET)

    const removeThis = await User.findOne({ _id: req.body.remove }, {_id:1, name:1, email:1})

    User.findOneAndUpdate(
        { _id: decoded.id },
        { $pull: {contacts: removeThis._id} },
        { new: true}
    ).then(()=>{
        res.json({
            message: 'Contact successfully removed.'
        })
    }).catch((err)=>{
        throw err.message
    })
}

exports.delete = async (req, res) => {
    const token = req.headers.authorization.split(" ")[1];
    const decoded = await jwt.verify(token, process.env.SECRET)

    await User.deleteOne({ _id: decoded.id })
        .catch((err) => {
            if (err) throw `Error deleting user`
        })

    res.status(200).json({
        message: 'Account successfully deleted'
    })
}

exports.addContact = async (req, res) => {
    const token = req.headers.authorization.split(" ")[1];
    const decoded = await jwt.verify(token, process.env.SECRET)

    const addThis = await User.findOne({ _id: req.body.add }, {_id:1, name:1, email:1})

    User.findOneAndUpdate(
        { _id: decoded.id },
        { $addToSet: {contacts: {_id:addThis._id, name:addThis.name, email:addThis.email}} },
    ).then(()=>{
        res.json({
            message: 'Contact successfully added.'
        })
    }).catch((err)=>{
        throw err.message
    })
}