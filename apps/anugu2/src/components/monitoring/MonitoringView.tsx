import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { NetworkDegradationMode } from '../../types';
import {
  Activity,
  Wifi,
  WifiOff,
  Server,
  RefreshCw,
  CheckCircle2,
  Database,
  Radio,
  Sliders,
  Send,
  PlusCircle
} from 'lucide-react';
import { BackButton } from '../common/BackButton';

export const MonitoringView: React.FC = () => {
  const { isOfflineMode, toggleOfflineMode, offlineQueueCount, syncOfflineQueue, addNotification } = useApp();

  // Network degradation mode based on Linux tc benchmark from PDF
  const [networkMode, setNetworkMode] = useState<NetworkDegradationMode>('normal');
  const [mqttTopic] = useState('land/registration/status');
  const [mqttQos, setMqttQos] = useState<1 | 2>(2);

  // Field offline queue simulation items
  const [localQueue, setLocalQueue] = useState([
    { id: 'q-101', beacon: 'BC-FIELD-09', lat: 6.4389, lng: 3.4721, time: '10:42:15 AM', status: 'Queued Locally' },
    { id: 'q-102', beacon: 'BC-FIELD-10', lat: 6.4392, lng: 3.4728, time: '10:44:02 AM', status: 'Queued Locally' }
  ]);

  const getLatencyAndPacketLoss = () => {
    switch (networkMode) {
      case 'severe':
        return { latency: '524ms', loss: '25% Packet Drop', color: 'text-red-700' };
      case 'moderate':
        return { latency: '228ms', loss: '10% Packet Drop', color: 'text-amber-700' };
      default:
        return { latency: '24ms', loss: '0% Packet Loss', color: 'text-[#245C43]' };
    }
  };

  const netStats = getLatencyAndPacketLoss();

  const handleQueueOfflineBeacon = () => {
    const newIdx = localQueue.length + 1;
    const newBeacon = {
      id: `q-${Date.now()}`,
      beacon: `BC-FIELD-${10 + newIdx}`,
      lat: Number((6.438 + Math.random() * 0.005).toFixed(4)),
      lng: Number((3.471 + Math.random() * 0.005).toFixed(4)),
      time: new Date().toLocaleTimeString(),
      status: 'Queued Locally'
    };
    setLocalQueue(prev => [...prev, newBeacon]);
    addNotification({
      title: 'Beacon Cached Offline',
      message: `Pillar ${newBeacon.beacon} logged in local IndexedDB edge storage.`,
      type: 'info'
    });
  };

  const handleFlushQueue = () => {
    syncOfflineQueue();
    setLocalQueue([]);
    addNotification({
      title: 'Edge Queue Flushed',
      message: 'All cached cadastral beacons transmitted via MQTT topic land/registration/status.',
      type: 'success'
    });
  };

  const nodes = [
    { name: 'Node-01 (Lagos Sovereign Cluster)', ip: '102.89.44.10', role: 'Leader Validator', cpu: '28%', status: 'Online' },
    { name: 'Node-02 (Surveyors Registration Council)', ip: '105.112.18.22', role: 'Follower', cpu: '19%', status: 'Online' },
    { name: 'Node-03 (Federal Ministry of Housing)', ip: '197.210.9.14', role: 'Follower', cpu: '22%', status: 'Online' },
    { name: 'Node-04 (Abuja National Geo-Data Center)', ip: '102.91.88.90', role: 'Follower', cpu: '25%', status: 'Online' }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6 bg-white text-[#252B28]">
      <div className="flex items-center justify-between">
        <BackButton to="/portal/dashboard" label="Back to Dashboard" />
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E8E5]">
        <div>
          <h1 className="text-2xl font-bold text-[#252B28] flex items-center gap-2">
            <Activity className="w-6 h-6 text-[#245C43]" />
            Consensus Cluster &amp; MQTT Telemetry Monitor
          </h1>
          <p className="text-xs text-[#4A524D] mt-1">
            Real-time Raft-BFT node consensus, MQTT edge broker throughput, and rural surveyor offline queue.
          </p>
        </div>

        <button
          onClick={toggleOfflineMode}
          className={`px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 border transition-all ${
            isOfflineMode
              ? 'bg-amber-50 text-amber-900 border-amber-300'
              : 'bg-white text-[#252B28] border-[#CBD0C8] hover:bg-[#F7F8F7]'
          }`}
        >
          {isOfflineMode ? <WifiOff className="w-4 h-4 text-amber-700" /> : <Wifi className="w-4 h-4 text-[#245C43]" />}
          <span>{isOfflineMode ? 'Edge Disconnected (Offline Cache Active)' : 'Simulate Offline Field Survey'}</span>
        </button>
      </div>

      {/* Cluster Health Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-white border border-[#E5E8E5] shadow-xs space-y-1">
          <div className="text-xs font-semibold text-[#4A524D]">Consensus Nodes</div>
          <div className="text-2xl font-bold font-mono text-[#245C43]">4 / 4</div>
          <div className="text-xs text-[#4A524D]">100% Operational Quorum</div>
        </div>

        <div className="p-5 rounded-xl bg-white border border-[#E5E8E5] shadow-xs space-y-1">
          <div className="text-xs font-semibold text-[#4A524D]">MQTT Broker Rate</div>
          <div className="text-2xl font-bold font-mono text-[#252B28]">14,290 msg/s</div>
          <div className="text-xs text-[#245C43] font-mono">Topic: {mqttTopic}</div>
        </div>

        <div className="p-5 rounded-xl bg-white border border-[#E5E8E5] shadow-xs space-y-1">
          <div className="text-xs font-semibold text-[#4A524D]">Edge Local Cache</div>
          <div className="text-2xl font-bold font-mono text-[#252B28]">
            {isOfflineMode ? 'Buffering' : 'Synced'}
          </div>
          <div className="text-xs text-amber-800">
            {localQueue.length} field events queued in storage
          </div>
        </div>

        <div className="p-5 rounded-xl bg-white border border-[#E5E8E5] shadow-xs space-y-1">
          <div className="text-xs font-semibold text-[#4A524D]">Roundtrip Latency ({networkMode.toUpperCase()})</div>
          <div className={`text-2xl font-bold font-mono ${netStats.color}`}>{netStats.latency}</div>
          <div className="text-xs text-[#4A524D] font-mono">{netStats.loss}</div>
        </div>
      </div>

      {/* Network Degradation Benchmark Control Strip */}
      <div className="p-5 rounded-xl bg-white border border-[#E5E8E5] shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#E5E8E5]">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#245C43]" />
            <span className="text-xs font-bold text-[#252B28] uppercase tracking-wider">
              Network Degradation Simulation (Linux Traffic Control 'tc' Model)
            </span>
          </div>
          <span className="text-xs text-[#4A524D] font-mono">Nigeria Telecom Backhaul Conditions</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <button
            type="button"
            onClick={() => setNetworkMode('normal')}
            className={`p-3.5 rounded-lg border text-left transition-all ${
              networkMode === 'normal'
                ? 'bg-[#F7F8F7] border-[#245C43] ring-1 ring-[#245C43]'
                : 'bg-white border-[#E5E8E5] hover:bg-[#F7F8F7]'
            }`}
          >
            <div className="font-bold flex items-center justify-between">
              <span className="text-[#252B28]">Profile 1: Normal Network</span>
              <span className="text-xs text-[#245C43] font-mono">&lt;30ms / 0% loss</span>
            </div>
            <p className="text-xs text-[#4A524D] mt-1">Standard metropolitan urban connectivity with instant edge relay.</p>
          </button>

          <button
            type="button"
            onClick={() => setNetworkMode('moderate')}
            className={`p-3.5 rounded-lg border text-left transition-all ${
              networkMode === 'moderate'
                ? 'bg-[#F7F8F7] border-[#245C43] ring-1 ring-[#245C43]'
                : 'bg-white border-[#E5E8E5] hover:bg-[#F7F8F7]'
            }`}
          >
            <div className="font-bold flex items-center justify-between">
              <span className="text-[#252B28]">Profile 2: Moderate Degradation</span>
              <span className="text-xs text-amber-700 font-mono">200ms / 10% loss</span>
            </div>
            <p className="text-xs text-[#4A524D] mt-1">Suburban 3G/edge cellular link with intermittent dropped packets.</p>
          </button>

          <button
            type="button"
            onClick={() => setNetworkMode('severe')}
            className={`p-3.5 rounded-lg border text-left transition-all ${
              networkMode === 'severe'
                ? 'bg-[#F7F8F7] border-[#245C43] ring-1 ring-[#245C43]'
                : 'bg-white border-[#E5E8E5] hover:bg-[#F7F8F7]'
            }`}
          >
            <div className="font-bold flex items-center justify-between">
              <span className="text-[#252B28]">Profile 3: Severe Degradation</span>
              <span className="text-xs text-red-700 font-mono">500ms / 25% loss</span>
            </div>
            <p className="text-xs text-[#4A524D] mt-1">Remote rural boundary traverse with heavy packet loss &amp; buffer retry.</p>
          </button>
        </div>
      </div>

      {/* MQTT Message Schema & Payload Inspector */}
      <div className="bg-white rounded-xl border border-[#E5E8E5] shadow-xs p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#E5E8E5]">
          <h2 className="text-sm font-bold text-[#252B28] flex items-center gap-2">
            <Radio className="w-4 h-4 text-[#245C43]" />
            MQTT Telemetry Broker &amp; Live Payload Inspector
          </h2>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#4A524D]">Quality of Service:</span>
            <button
              onClick={() => setMqttQos(1)}
              className={`px-2.5 py-1 rounded-md font-mono font-semibold ${mqttQos === 1 ? 'bg-[#245C43] text-white' : 'bg-white border border-[#CBD0C8] text-[#252B28]'}`}
            >
              QoS 1 (At Least Once)
            </button>
            <button
              onClick={() => setMqttQos(2)}
              className={`px-2.5 py-1 rounded-md font-mono font-semibold ${mqttQos === 2 ? 'bg-[#245C43] text-white' : 'bg-white border border-[#CBD0C8] text-[#252B28]'}`}
            >
              QoS 2 (Exactly Once)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-4 rounded-lg bg-[#F7F8F7] border border-[#E5E8E5] space-y-2">
            <div className="text-[#4A524D] font-sans font-semibold text-xs flex items-center justify-between">
              <span>Active Broadcast Topic</span>
              <span className="text-[#245C43] font-semibold">BROKER ACTIVE</span>
            </div>
            <div className="p-2.5 rounded bg-white border border-[#CBD0C8] text-[#245C43] font-bold">
              {mqttTopic}
            </div>
            <div className="text-xs text-[#4A524D] font-sans pt-1">
              Subscribed Clients: Web Cadastre Console, Android Surveyor PWA, Registrar Node, National Title Archive.
            </div>
          </div>

          <div className="p-4 rounded-lg bg-[#F7F8F7] border border-[#E5E8E5] space-y-2">
            <div className="text-[#4A524D] font-sans font-semibold text-xs flex items-center justify-between">
              <span>Live Dispatched JSON Payload (QoS {mqttQos})</span>
              <span className="text-[#245C43]">SHA-256 Signed</span>
            </div>
            <pre className="p-2.5 rounded bg-white border border-[#CBD0C8] text-xs text-[#252B28] overflow-x-auto leading-relaxed">
{`{
  "topic": "${mqttTopic}",
  "applicationId": "ANAGU-APP-2026-8849",
  "parcelId": "pcl-001",
  "stage": "SPATIAL_VERIFICATION_COMPLETE",
  "status": "APPROVED",
  "qos": ${mqttQos},
  "timestamp": ${Math.floor(Date.now() / 1000)},
  "latencyProfile": "${networkMode}",
  "signature": "0x8f2a994c...18de29b1"
}`}
            </pre>
          </div>
        </div>
      </div>

      {/* Offline Edge Queue Inspector & Field Simulation */}
      <div className="bg-white rounded-xl border border-[#E5E8E5] shadow-xs p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#E5E8E5]">
          <h2 className="text-sm font-bold text-[#252B28] flex items-center gap-2">
            <Database className="w-4 h-4 text-[#245C43]" />
            Field Surveyor Edge Local Queue (IndexedDB Buffer)
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleQueueOfflineBeacon}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#F7F8F7] text-[#252B28] text-xs font-semibold flex items-center gap-1.5 border border-[#CBD0C8]"
            >
              <PlusCircle className="w-3.5 h-3.5 text-[#245C43]" />
              <span>Log Offline Beacon</span>
            </button>
            {localQueue.length > 0 && (
              <button
                onClick={handleFlushQueue}
                className="px-3 py-1.5 rounded-lg bg-[#245C43] hover:bg-[#1B4733] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Flush &amp; Replay Queue ({localQueue.length})</span>
              </button>
            )}
          </div>
        </div>

        {localQueue.length === 0 ? (
          <div className="p-6 text-center text-xs text-[#4A524D] bg-[#F7F8F7] rounded-lg border border-[#E5E8E5]">
            No pending cadastral items in local edge storage. All survey data synchronized with cluster.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[#E5E8E5] bg-white">
            <table className="w-full text-left text-xs font-mono">
              <thead className="text-xs uppercase text-[#252B28] font-semibold border-b border-[#E5E8E5] bg-[#F7F8F7]">
                <tr>
                  <th className="py-2.5 px-3">Queue ID</th>
                  <th className="py-2.5 px-3">Beacon Pillar</th>
                  <th className="py-2.5 px-3">Latitude</th>
                  <th className="py-2.5 px-3">Longitude</th>
                  <th className="py-2.5 px-3">Logged Time</th>
                  <th className="py-2.5 px-3">Buffer State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E8E5] text-xs">
                {localQueue.map(item => (
                  <tr key={item.id} className="hover:bg-[#F7F8F7]">
                    <td className="py-2 px-3 text-[#4A524D]">{item.id}</td>
                    <td className="py-2 px-3 text-[#245C43] font-bold">{item.beacon}</td>
                    <td className="py-2 px-3 text-[#252B28]">{item.lat}</td>
                    <td className="py-2 px-3 text-[#252B28]">{item.lng}</td>
                    <td className="py-2 px-3 text-[#4A524D]">{item.time}</td>
                    <td className="py-2 px-3">
                      <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-sans font-semibold">
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Validator Nodes Table */}
      <div className="bg-white rounded-xl border border-[#E5E8E5] shadow-xs p-5 space-y-4">
        <h2 className="text-sm font-bold text-[#252B28] flex items-center gap-2 pb-2 border-b border-[#E5E8E5]">
          <Server className="w-4 h-4 text-[#245C43]" />
          Raft-BFT Consensus Validator Nodes
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="text-xs uppercase text-[#252B28] font-semibold border-b border-[#E5E8E5] bg-[#F7F8F7]">
              <tr>
                <th className="py-2.5 px-3">Node Identifier</th>
                <th className="py-2.5 px-3">IP Address</th>
                <th className="py-2.5 px-3">Consensus Role</th>
                <th className="py-2.5 px-3">CPU Load</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E8E5]">
              {nodes.map((node, i) => (
                <tr key={i} className="hover:bg-[#F7F8F7] transition-colors">
                  <td className="py-2.5 px-3 font-sans font-semibold text-[#252B28]">{node.name}</td>
                  <td className="py-2.5 px-3 text-[#4A524D]">{node.ip}</td>
                  <td className="py-2.5 px-3 text-[#245C43] font-medium">{node.role}</td>
                  <td className="py-2.5 px-3 text-[#252B28]">{node.cpu}</td>
                  <td className="py-2.5 px-3">
                    <span className="text-xs px-2 py-0.5 rounded bg-[#245C43]/10 text-[#245C43] font-semibold flex items-center gap-1 w-max">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{node.status}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
