import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface Device {
  deviceId: string;
  status: 'online' | 'offline';
  lastSeen: string;
  activeParams: Record<string, any>;
  lastImage?: {
    filePath: string;
    timestamp: string;
  };
}

const DeviceList: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);

  useEffect(() => {
    axios.defaults.baseURL = 'http://localhost:5000';
    axios.get('/api/devices')
      .then(res => setDevices(res.data))
      .catch(err => {
        console.error('❌ Failed to fetch devices:', err)

        const mockDevice: Device = {
          deviceId: 'Device 1',
          status: 'online',
          lastSeen: new Date().toISOString(),
          activeParams: {
            brightness: 0,
            exposure: 0,
          }
        };

        setDevices([mockDevice]);
      });
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h2>📡 Dispozitive conectate</h2>
      {devices.map((device) => (
        <div
          key={device.deviceId}
          style={{
            border: '1px solid #ccc',
            padding: 16,
            borderRadius: 8,
            marginBottom: 16,
            backgroundColor: device.status === 'online' ? '#eaffea' : '#ffeaea',
          }}
        >
          <h3>{device.deviceId}</h3>
          <p>Status: <strong style={{ color: device.status === 'online' ? 'green' : 'red' }}>{device.status}</strong></p>
          <p>Last seen: {new Date(device.lastSeen).toLocaleString()}</p>
          <p>Parametri activi: {JSON.stringify(device.activeParams)}</p>
          {device.lastImage?.filePath && (
            <img
              src={device.lastImage.filePath}
              alt="Ultima imagine"
              style={{ maxWidth: 300, marginTop: 10 }}
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default DeviceList;
