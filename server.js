const express = require('express');
const app = express();
const server = require('http').createServer(app);
const cors = require('cors');
const io = require('socket.io')(server, {
    cors: {
        origin: '*',
    }
});

// Data base setting 
const mongoose = require("mongoose");
mongoose
    .connect("mongodb://127.0.0.1:27017/myTable", {
        useNewUrlParser: true,
        useCreateIndex: true,
        useUnifiedTopology: true
    })
    .then(() => {
        console.log("Connected to MongoDB")
    })
    .catch((err) => {
        console.log(err);
    })
// Data base schema setting
const UserSchema = new mongoose.Schema({
    id: String,
    pw: String
});
const ChatRoom = new mongoose.Schema({
    id: Number,
    location: String,
    logo: String,
    isnew: Boolean,
    featured: Boolean,
    position: String,
    postedAt: String,
    subtitle: String,
    members: Number,
    category: Array
});
const User = mongoose.model("User", UserSchema);
const Room = mongoose.model("Room", ChatRoom);



app.use(cors());
app.use(express.json())

app.get('/users', (req, res) => {
    console.log("연결되었습니다.");
    res.send("Hello");
    res.end();
})
// Serverside for sign up
app.post('/signup', async (req, res) => {
    console.log("회원가입 요청이 들어왔습니다.");
    const data = req.body;
    var newUser = new User({
        id: data.id,
        pw: data.pw
    })
    var isSame = await isPwSame(data.pw, data.pw2)
    if (isSame) {
        newUser.save()
            .then(() => {
                console.log(newUser);
            })
            .catch((err) => {
                console.log("Error: " + err);
            })
        console.log(data);
    }
    res.send(JSON.stringify({ token: isSame }));
    res.end();
})

// Serverside for login
app.post('/login', async (req, res) => {
    console.log("로그인 요청이 들어왔습니다.");
    const data = req.body;
    // find matching data from DB
    var newUser = mongoose.model("User", UserSchema);
    newUser.find({ id: data.id }, async (err, result) => {
        if (err) throw (err);
        var jsonObj = await loginProcess(result, data.pw);
        res.send(jsonObj);
        res.end();
    });
})

// Serverside for make chat room request
app.post('/makeroom', async (req, res) => {
    console.log("방 만들기 요청이 들어왔습니다.");
    const data = req.body;
    var newRoom = new Room({
        id: data.id,
        location: data.location,
        logo: data.logo,
        isnew: data.isnew,
        featured: data.featured,
        position: data.position,
        postedAt: data.postedAt,
        subtitle: data.subtitle,
        members: data.members,
        category: data.category
    });

    newRoom.save()
        .then(
            console.log(newRoom)
        )
        .catch((err) =>
            console.log("Error: " + err)
        )
    res.send(JSON.stringify({ roomId: data.id }));
    res.end();
})

io.on('connection', socket => {
    console.log("연결되었습니다.");
    const id = socket.handshake.query.id;
    socket.join(id);

    socket.on('send-message', ({ recipients, text }) => {
        console.log("connected");
        recipients.forEach(recipient => {
            const newRecipients = recipients.filter(r => r !== recipient);
            newRecipients.push(id);
            socket.broadcast.to(recipient).emit('receive-message', {
                recipients: newRecipients, sender: id, text
            });
        })
    });
});

async function isPwSame(a, b) {
    return a === b;
}

async function loginProcess(result, pw) {
    if (result.length == 0) {
        return JSON.stringify({ token: false, type: 1 });
    } else {
        if (result[0].pw == pw) {
            return JSON.stringify({ token: true, type: 1 });
        } else {
            return JSON.stringify({ token: false, type: 2 });
        }
    }
}

server.listen(3001);