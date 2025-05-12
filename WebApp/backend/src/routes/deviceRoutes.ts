router.get('/', async (req, res) => {
    const devices = await Device.find();
    const result = await Promise.all(devices.map(async (device) => {
      const lastImage = await Image.findOne({ device: device.deviceId }).sort({ timestamp: -1 });
      return { 
        deviceId: device.deviceId,
        status: device.status,
        lastSeen: device.lastSeen,
        activeParams: device.activeParams,
        lastImage
      };
    }));
  
    res.json(result);
  });
  

  router.post('/:deviceId/control', async (req, res) => {
    const { deviceId } = req.params;
    const { command, params } = req.body;
  
    const topic = `control/${deviceId}`;
    const payload = JSON.stringify({ command, params });
  
    client.publish(topic, payload, {}, (err) => {
      if (err) return res.status(500).json({ error: 'Failed to send command' });
      res.json({ status: 'Command sent' });
    });
  });
  