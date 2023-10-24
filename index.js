const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
require("dotenv").config();
const app = express();
const PORT = 3000;

const passwd = encodeURIComponent(process.env.PASSWD);
const usr = encodeURIComponent(process.env.USR);
const uri = `mongodb+srv://${usr}:${passwd}@student-server.k8mzdia.mongodb.net/?retryWrites=true&w=majority`;

// MongoDB connection setup
mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));

// Define Mentor and Student schemas
const mentorSchema = new mongoose.Schema({
  name: String,
  students: [mongoose.Schema.Types.ObjectId],
});
const studentSchema = new mongoose.Schema({
  name: String,
  mentor: mongoose.Schema.Types.ObjectId,
});

const Mentor = mongoose.model("Mentor", mentorSchema);
const Student = mongoose.model("Student", studentSchema);

app.use(bodyParser.json());

// API to create a Mentor
app.post("/mentors", async (req, res) => {
  try {
    const mentor = new Mentor(req.body);
    const result = await mentor.save();
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: "Could not create Mentor" });
  }
});

// API to create a Student
app.post("/students", async (req, res) => {
  try {
    const student = new Student(req.body);
    const result = await student.save();
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: "Could not create Student" });
  }
});

// API to assign a Student to a Mentor
app.put("/assign-student/:mentorId/:studentId", async (req, res) => {
  try {
    const mentor = await Mentor.findById(req.params.mentorId);
    if (!mentor) {
      return res.status(404).json({ error: "Mentor not found" });
    }

    const student = await Student.findById(req.params.studentId);
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    mentor.students.push(student._id);
    student.mentor = mentor._id;

    await mentor.save();
    await student.save();

    res.status(200).json({ message: "Student assigned to Mentor" });
  } catch (error) {
    res.status(500).json({ error: "Could not assign Student to Mentor" });
  }
});

// API to list all unassigned students
app.get("/unassigned-students", async (req, res) => {
  try {
    const unassignedStudents = await Student.find({ mentor: null });
    res.status(200).json(unassignedStudents);
  } catch (error) {
    res.status(500).json({ error: "Could not retrieve unassigned students" });
  }
});

// API to assign or change a Mentor for a particular Student
app.put("/assign-mentor/:studentId/:mentorId", async (req, res) => {
  try {
    const student = await Student.findById(req.params.studentId);
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    const newMentor = await Mentor.findById(req.params.mentorId);
    if (!newMentor) {
      return res.status(404).json({ error: "Mentor not found" });
    }

    // Remove the student from the old mentor's list (if any)
    if (student.mentor) {
      const oldMentor = await Mentor.findById(student.mentor);
      if (oldMentor) {
        oldMentor.students = oldMentor.students.filter(
          (id) => id != student._id
        );
        await oldMentor.save();
      }
    }

    student.mentor = newMentor._id;
    newMentor.students.push(student._id);

    await student.save();
    await newMentor.save();

    res.status(200).json({ message: "Mentor assigned to Student" });
  } catch (error) {
    res.status(500).json({ error: "Could not assign Mentor to Student" });
  }
});

// API to show all students for a particular mentor
app.get("/mentor-students/:mentorId", async (req, res) => {
  try {
    const mentor = await Mentor.findById(req.params.mentorId);
    if (!mentor) {
      return res.status(404).json({ error: "Mentor not found" });
    }

    const students = await Student.find({ mentor: mentor._id });
    res.status(200).json(students);
  } catch (error) {
    res.status(500).json({ error: "Could not retrieve mentor students" });
  }
});

// API to show the previously assigned mentor for a particular student
app.get("/previous-mentor/:studentId", async (req, res) => {
  try {
    const student = await Student.findById(req.params.studentId);
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    const mentor = await Mentor.findById(student.mentor);
    if (!mentor) {
      return res.status(404).json({ error: "Previous Mentor not found" });
    }

    res.status(200).json(mentor);
  } catch (error) {
    res.status(500).json({ error: "Could not retrieve previous Mentor" });
  }
});
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
