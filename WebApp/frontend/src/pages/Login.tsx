import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const Login: React.FC = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        try {
            const response = await fetch("http://localhost:5000/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Login failed");
            }

            localStorage.setItem("token", data.token);
            navigate("/gallery");
        } catch (err) {
            setError((err as Error).message);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <h2 style={styles.title}>Login</h2>
                {error && <p style={styles.error}>{error}</p>}
                <form onSubmit={handleLogin}>
                    <div style={styles.formGroup}>
                        <label>Username:</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            style={styles.input}
                            required
                        />
                    </div>
                    <div style={styles.formGroup}>
                        <label>Password:</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={styles.input}
                            required
                        />
                    </div>
                    <button type="submit" style={styles.button}>Login</button>
                </form>
                <p style={{ marginTop: "15px" }}>
                    Don't have an account?{" "}
                    <button
                        onClick={() => navigate("/register")}
                        style={styles.linkButton}
                    >
                        Register
                    </button>
                </p>
            </div>
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        display: "flex",
        height: "100vh",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f3f4f6",
    },
    card: {
        backgroundColor: "white",
        padding: "30px",
        borderRadius: "10px",
        boxShadow: "0 0 10px rgba(0, 0, 0, 0.1)",
        width: "100%",
        maxWidth: "400px",
    },
    title: {
        marginBottom: "20px",
        textAlign: "center",
    },
    formGroup: {
        marginBottom: "15px",
        display: "flex",
        flexDirection: "column",
    },
    input: {
        padding: "10px",
        borderRadius: "5px",
        border: "1px solid #ccc",
    },
    button: {
        width: "100%",
        padding: "10px",
        borderRadius: "5px",
        border: "none",
        backgroundColor: "#4f46e5",
        color: "white",
        cursor: "pointer",
        fontWeight: "bold",
    },
    linkButton: {
        background: "none",
        border: "none",
        color: "#4f46e5",
        cursor: "pointer",
        textDecoration: "underline",
        padding: 0,
        fontSize: "1em",
    },
    error: {
        color: "red",
        marginBottom: "15px",
    },
};

export default Login;
