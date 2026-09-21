import { Router } from "express";

const router = Router();

interface User {
    id: string,
    username: string,
    email: string
}

const users: User[] = []

router.post("/signup", async (req, res) => {
    const { email, userName } = req.body;

    if (!email || !userName) {
        return res.status(403).json({
            message: "please valid data "
        })
    }

    const checkUser = users.find((data) => { return data.email === email });
    if (checkUser) {
        return res.status(400).json({
            message: "user already exist"
        })
    }

    const newUser: User = {
        id: String(Math.random()),
        username: userName,
        email: email
    }

    users.push(newUser);

    return res.status(201).json({
        message: "user created successfully ",
        user: newUser.id
    })

})

export default router