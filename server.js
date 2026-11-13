
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "public")));

// สร้างโฟลเดอร์ฐานข้อมูลหากยังไม่มี
const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const databaseFile = path.join(dataDir, "database.json");

if (!fs.existsSync(databaseFile)) {
    fs.writeFileSync(
        databaseFile,
        JSON.stringify({
            panels: [],
            applications: []
        }, null, 2)
    );
}

// อ่านข้อมูล
function readDatabase() {
    return JSON.parse(fs.readFileSync(databaseFile, "utf8"));
}

// บันทึกข้อมูล
function saveDatabase(data) {
    fs.writeFileSync(
        databaseFile,
        JSON.stringify(data, null, 2)
    );
}

// ตรวจสอบเซิร์ฟเวอร์
app.get("/api/status", (req, res) => {
    res.json({
        server: "FROST CITY RP",
        status: "online",
        system: "New Application System"
    });
});

// ดูรายการแบบฟอร์ม
app.get("/api/panels", (req, res) => {
    const db = readDatabase();
    res.json(db.panels);
});

// เพิ่มแบบฟอร์ม
app.post("/api/panels", (req, res) => {
    const { name, description, questions, passMark } = req.body;

    if (!name || !Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({
            error: "กรุณากรอกชื่อและเพิ่มคำถามอย่างน้อย 1 ข้อ"
        });
    }

    const db = readDatabase();

    const panel = {
        id: Date.now().toString(),
        name,
        description: description || "",
        questions,
        passMark: Number(passMark) || 70,
        createdAt: new Date().toISOString()
    };

    db.panels.push(panel);
    saveDatabase(db);

    res.json({ success: true, panel });
});

// ส่งคำตอบและตรวจคะแนนอัตโนมัติ
app.post("/api/applications", (req, res) => {
    const { panelId, nickname, icName, answers } = req.body;
    const db = readDatabase();

    const panel = db.panels.find(p => p.id === panelId);

    if (!panel) {
        return res.status(404).json({ error: "ไม่พบแบบฟอร์ม" });
    }

    if (!nickname || !icName || !Array.isArray(answers)) {
        return res.status(400).json({ error: "ข้อมูลผู้สมัครไม่ครบ" });
    }

    let score = 0;
    let total = 0;

    panel.questions.forEach((question, index) => {
        const points = Number(question.points) || 1;
        total += points;

        if (answers[index] === question.correct) {
            score += points;
        }
    });

    const percent = total ? Math.round(score / total * 100) : 0;
    const passed = percent >= panel.passMark;

    const application = {
        id: Date.now().toString(),
        panelId,
        nickname,
        icName,
        answers,
        score,
        total,
        percent,
        result: passed ? "ผ่าน" : "ไม่ผ่าน",
        createdAt: new Date().toISOString()
    };

    db.applications.push(application);
    saveDatabase(db);

    res.json({
        success: true,
        score,
        total,
        percent,
        result: application.result
    });
});

// ดูผลการสมัคร
app.get("/api/applications", (req, res) => {
    const db = readDatabase();
    res.json(db.applications);
});

app.listen(PORT, () => {
    console.log("--------------------------------");
    console.log(" FROST CITY RP");
    console.log(" SERVER ONLINE");
    console.log(` http://localhost:${PORT}`);
    console.log("--------------------------------");
});
