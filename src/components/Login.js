import { useState } from "react";
import axios from "axios";

const Login = ({ setToken }) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const apiBase = process.env.REACT_APP_API_URL || "http://localhost:5001";
            const res = await axios.post(`${apiBase}/api/auth/login`, { username: email, password }, { withCredentials: true });
            setToken(res.data.token);
            localStorage.setItem("token", res.data.token);
        } catch (err) {
            console.error("Login error", err);
            const message = err.response?.data?.error || err.message || "Login failed";
            alert(`Login failed: ${message}`);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <input type="text" placeholder="Username (mule)" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input type="password" placeholder="Password (1234)" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button type="submit">Login</button>
        </form>
    );
};

export default Login;