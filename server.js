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
    id: String,
    owner: String,
    title: String,
    subtitle: String,
    location: String,
    members: Number,
    personnel: Number,
    logo: String,
    category: Array,
    startDate: String,
    endDate: String,
    recipients: Array
});
const ChatHistory = new mongoose.Schema({
    sender: String,
    text: String
});
const User = mongoose.model("User", UserSchema);
const Room = mongoose.model("Room", ChatRoom);
const History = mongoose.model("Chat", ChatRoom);

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

// Serverside for get chat room information
app.get('/makeroom', (req, res) => {
    console.log("방 데이터를 요청하였습니다.")
    var newRoom = mongoose.model("Room", ChatRoom);
    newRoom.find({}, (err, result) => {
        if (err) throw (err);
        res.send(JSON.stringify(result));
        res.end();
    });
})

// Serverside for make chat room request
app.post('/makeroom', (req, res) => {
    console.log("방 만들기 요청이 들어왔습니다.");
    const data = req.body;
    var newRoom = new Room({
        id: data.id,
        owner: data.owner,
        title: data.title,
        subtitle: data.subtitle,
        location: data.location,
        members: 1,
        personnel: data.personnel,
        logo: data.logo,
        category: data.category,
        startDate: data.startDate,
        endDate: data.endDate,
        recipients: [data.owner]
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

// Serverside for entrance request
app.post('/entrance', (req, res) => {
    console.log("방 입장 요청이 들어왔습니다.");
    const data = req.body;
    console.log(data);

    var Room = mongoose.model("Room", ChatRoom);
    Room.find({ id: data.roomId }, (err, result) => {
        if (err) throw (err);
        if (data.userId != null) {

            if (!result[0].recipients.includes(data.userId)) {
                if (result[0].members < result[0].personnel) {
                    Room.update({ id: data.roomId }, { recipients: [...result[0].recipients, data.userId], members: result[0].members + 1 }, () => {
                        console.log(result[0].members);
                        res.send(JSON.stringify({ recipients: [...result[0].recipients, data.userId] }));
                        res.end();
                    });
                } else {
                    console.log("입장 인원을 초과했습니다.");
                    res.send(JSON.stringify({ token: true }));
                    res.end();
                }
            } else {
                console.log("아이디가 이미 있습니다.")
                res.send(JSON.stringify({ recipients: result[0].recipients }));
                res.end();
            }
        } else {
            console.log("올바르지 않은 아이디 값입니다.");
            res.end();
        }
    })
})

// 방 정보 요청
app.get('/chatroom/:roomId', (req, res) => {
    console.log("방 정보를 요청합니다.")
    var Room = mongoose.model("Room", ChatRoom);
    Room.find({ id: req.params.roomId }, (err, result) => {
        if (err) throw (err);
        console.log(result[0].recipients);
        res.send(JSON.stringify({ recipients: result[0].recipients }));
        res.end();
    })
})

// 방 나가기 요청
app.get('/exit/chatroom/:roomId/:userId', (req, res) => {
    console.log("방 나가기 요청을 합니다.");
    var Room = mongoose.model("Room", ChatRoom);
    Room.find({ id: req.params.roomId }, (err, result) => {
        if (err) throw (err);
        var idx = result[0].recipients.indexOf(req.params.userId);
        result[0].recipients.splice(idx, 1);
        Room.update({ id: req.params.roomId }, { recipients: result[0].recipients, members: result[0].members - 1 }, () => {
            res.end();
        })
    })
})

app.get('/mypage', (req, res) => {
    console.log("DB 자료.")
    var Room = mongoose.model("Room", ChatRoom);
    Room.find({}, (err, result) => {
        if (err) throw (err);
        res.send(JSON.stringify(result));
        res.end();
    })
})

app.get('/delete/chatroom/:roomId/:userId', (req, res) => {
    console.log(req.params.roomId, req.params.userId);
    var Room = mongoose.model("Room", ChatRoom);
    Room.find({ id: req.params.roomId }, (err, result) => {
        if (err) throw (err);
        if (result[0].owner == req.params.userId) {
            // 삭제 
            Room.remove({ id: req.params.roomId }, (err, result) => {
                if (err) throw (err);
                res.send(JSON.stringify({ token: true }));
                res.end();
            })
        } else {
            res.send(JSON.stringify({ token: false }));
            res.end();
        }
    })
})

io.on('connection', socket => {
    console.log("연결되었습니다.");
    const id = socket.handshake.query.id;
    socket.join(id);

    socket.on('send-message', ({ recipients, text }) => {
        console.log("connected");
        // Store in DataBase
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