import axios from "axios";

const API = axios.create({
    baseURL: "http://localhost:5000",
});

export const registerUser = (user: { username: string; password: string; role: string }) =>
    API.post("/register", user);

export const loginUser = (user: { username: string; password: string }) =>
    API.post("/login", user);

export const fetchImages = () => API.get("/uploads");
