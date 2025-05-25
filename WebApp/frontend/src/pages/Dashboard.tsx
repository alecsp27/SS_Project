import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface Image {
    _id: string;
    filename: string;
    timestamp: string;
    device: string;
}

const Dashboard: React.FC = () => {
    const [images, setImages] = useState<Image[]>([]);
    const [error, setError] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem("token");

        if (!token) {
            navigate("/login");
            return;
        }

        fetch("http://localhost:5000/images", {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => {
                if (!res.ok) throw new Error("Failed to fetch images");
                return res.json();
            })
            .then((data) => setImages(data))
            .catch((err) => setError(err.message));
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem("token");
        navigate("/");
    };

    return (
        <div style={{ maxWidth: "800px", margin: "auto", padding: "20px" }}>
            <h2>Dashboard</h2>
            <button onClick={handleLogout}>Logout</button>

            {error && <p style={{ color: "red" }}>{error}</p>}

            <h3>Uploaded Images</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
                {images.map((image) => (
                    <div key={image._id}>
                        <img
                            src={`http://localhost:5000/uploads/${image.filename}`}
                            alt={`Captured by ${image.device}`}
                            style={{ width: "100%", borderRadius: "8px" }}
                        />
                        <p>Device: {image.device}</p>
                        <p>Timestamp: {new Date(image.timestamp).toLocaleString()}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Dashboard;
