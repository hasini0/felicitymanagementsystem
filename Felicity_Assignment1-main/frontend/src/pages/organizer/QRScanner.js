import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import Navbar from '../../components/Navbar';
import toast from 'react-hot-toast';
import axios from 'axios';
import { FaQrcode, FaUserPlus, FaDownload, FaCheckCircle, FaTimesCircle, FaArrowLeft, FaStop, FaPlay } from 'react-icons/fa';

const QRScanner = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState(null);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [participantEmail, setParticipantEmail] = useState('');
  const [notes, setNotes] = useState('');

  // Refs for scanner control — these survive re-renders
  const html5QrcodeRef = useRef(null);
  const isProcessingRef = useRef(false);
  const scannerStartedRef = useRef(false);

  useEffect(() => {
    fetchEvent();
    fetchAttendance();
  }, [eventId]);

  const fetchEvent = async () => {
    try {
      const response = await axios.get(`/api/events/${eventId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setEvent(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch event details');
    }
  };

  const fetchAttendance = async () => {
    try {
      const response = await axios.get(`/api/events/${eventId}/attendance`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setAttendanceData(response.data);
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
    }
  };

  const onScanSuccess = useCallback(async (decodedText) => {
    // Hard gate: ignore if already handling a scan
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    try {
      const response = await axios.post(`/api/events/${eventId}/scan-qr`, {
        qrData: decodedText
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      if (response.data.success) {
        setLastScan({
          success: true,
          participant: response.data.participant,
          timestamp: response.data.timestamp
        });
        toast.success(`✅ ${response.data.participant.name} marked as attended!`);
        fetchAttendance();
      }
    } catch (error) {
      const isDuplicate = error.response?.data?.duplicate;
      setLastScan({
        success: false,
        message: error.response?.data?.message || 'Scan failed',
        isDuplicate
      });
      if (isDuplicate) {
        toast.error('⚠️ Already scanned!');
      } else {
        toast.error(error.response?.data?.message || 'Invalid QR code');
      }
    } finally {
      // Pause 3 seconds before allowing next scan
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 3000);
    }
  }, [eventId]);

  // Start camera AFTER scanning=true has caused the div to render in the DOM
  useEffect(() => {
    if (!scanning) return;

    let html5Qrcode;
    let started = false;

    const startCamera = async () => {
      try {
        html5Qrcode = new Html5Qrcode('qr-reader');
        html5QrcodeRef.current = html5Qrcode;
        await html5Qrcode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          onScanSuccess,
          () => { } // silent scan errors
        );
        started = true;
        scannerStartedRef.current = true;
      } catch (err) {
        toast.error('Could not access camera. Please check permissions.');
        console.error('Camera start error:', err);
        setScanning(false);
      }
    };

    startCamera();

    return () => {
      // Cleanup when scanning → false or component unmounts
      if (html5Qrcode && started) {
        html5Qrcode.stop().catch(() => { }).finally(() => {
          html5Qrcode.clear();
          scannerStartedRef.current = false;
        });
      }
    };
  }, [scanning, onScanSuccess]);

  const startScanning = () => {
    setScanning(true); // re-render first so div#qr-reader exists in DOM
  };

  const stopScanning = () => {
    setScanning(false); // useEffect cleanup handles camera.stop()
  };

  const handleManualAdd = async (e) => {
    e.preventDefault();
    try {
      const participantResponse = await axios.get(`/api/participant/search?email=${participantEmail}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      if (!participantResponse.data.participant) {
        toast.error('Participant not found');
        return;
      }

      const response = await axios.post(`/api/events/${eventId}/manual-attendance`, {
        participantId: participantResponse.data.participant._id,
        notes
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      toast.success(`${response.data.participant.name} manually marked as attended`);
      setShowManualAdd(false);
      setParticipantEmail('');
      setNotes('');
      fetchAttendance();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add attendance');
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await axios.get(`/api/events/${eventId}/attendance/export`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance-${event?.eventName}-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Attendance report downloaded!');
    } catch (error) {
      toast.error('Failed to export attendance');
    }
  };

  if (!event) {
    return (
      <>
        <Navbar />
        <div className="ml-64 pt-16 flex justify-center items-center h-screen bg-black">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="ml-64 pt-16 min-h-screen bg-gradient-to-br from-black via-dark-500 to-black">
        <div className="max-w-7xl mx-auto px-4 py-6">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(`/organizer/events/${eventId}`)}
                className="flex items-center gap-2 text-primary-400 hover:text-primary-300 transition-colors"
              >
                <FaArrowLeft /> Back
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  <FaQrcode className="text-primary-500" />
                  QR Scanner &amp; Attendance
                </h1>
                <p className="text-gray-400 text-sm">{event.eventName}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowManualAdd(!showManualAdd)}
                className="flex items-center px-3 py-2 bg-yellow-700 text-white rounded hover:bg-yellow-800 transition-all text-sm"
              >
                <FaUserPlus className="mr-2" />
                Manual Add
              </button>
              <button
                onClick={handleExportCSV}
                className="flex items-center px-3 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition-all text-sm"
              >
                <FaDownload className="mr-2" />
                Export CSV
              </button>
            </div>
          </div>

          {/* Main grid: scanner LEFT, stats + list RIGHT */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* LEFT: Scanner + Results */}
            <div className="space-y-4">
              {/* Scanner Card */}
              <div className="dark-card p-5">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-lg font-bold text-white">Camera Scanner</h2>
                  {scanning ? (
                    <button
                      onClick={stopScanning}
                      className="flex items-center gap-2 px-4 py-2 bg-red-700 text-white rounded hover:bg-red-800 transition-all text-sm"
                    >
                      <FaStop /> Stop
                    </button>
                  ) : (
                    <button
                      onClick={startScanning}
                      className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition-all text-sm"
                    >
                      <FaPlay /> Start Scanning
                    </button>
                  )}
                </div>

                {/* The camera feed always renders here; hidden when not scanning */}
                <div
                  id="qr-reader"
                  className={scanning ? 'rounded-lg overflow-hidden' : 'hidden'}
                />

                {!scanning && (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <FaQrcode className="text-gray-600 text-7xl mb-3" />
                    <p className="text-gray-400 text-sm">Press Start Scanning to activate the camera</p>
                  </div>
                )}
              </div>

              {/* Last Scan Result */}
              {lastScan && (
                <div className={`dark-card p-4 border ${lastScan.success ? 'border-green-700 bg-green-900/20' : 'border-red-700 bg-red-900/20'}`}>
                  <div className="flex items-center gap-3">
                    {lastScan.success
                      ? <FaCheckCircle className="text-green-400 text-2xl shrink-0" />
                      : <FaTimesCircle className="text-red-400 text-2xl shrink-0" />
                    }
                    <div>
                      {lastScan.success ? (
                        <>
                          <p className="font-semibold text-green-300">✅ {lastScan.participant.name}</p>
                          <p className="text-sm text-green-400">{lastScan.participant.email}</p>
                          <p className="text-xs text-green-500">Scanned at {new Date(lastScan.timestamp).toLocaleTimeString()}</p>
                        </>
                      ) : (
                        <p className="font-semibold text-red-300">{lastScan.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Manual Add Form */}
              {showManualAdd && (
                <div className="dark-card p-4 border border-primary-800">
                  <h3 className="font-semibold mb-3 text-white">Manual Attendance Entry</h3>
                  <form onSubmit={handleManualAdd} className="space-y-3">
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">Participant Email</label>
                      <input
                        type="email"
                        value={participantEmail}
                        onChange={(e) => setParticipantEmail(e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-dark-50 border border-primary-900 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
                        placeholder="participant@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">Notes (Optional)</label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full px-3 py-2 bg-dark-50 border border-primary-900 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
                        placeholder="Reason for manual entry..."
                        rows="2"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" className="flex-1 px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700">
                        Add Attendance
                      </button>
                      <button type="button" onClick={() => setShowManualAdd(false)} className="flex-1 px-4 py-2 bg-dark-100 border border-primary-900 text-gray-300 rounded hover:bg-dark-200">
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>

            {/* RIGHT: Stats + Recent Scans */}
            <div className="space-y-4">
              {/* Stats */}
              {attendanceData && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="dark-card p-4">
                    <h3 className="text-gray-400 text-xs mb-1">Total Registrations</h3>
                    <p className="text-2xl font-bold text-primary-500">{attendanceData.totalRegistrations}</p>
                  </div>
                  <div className="dark-card p-4">
                    <h3 className="text-gray-400 text-xs mb-1">Attended</h3>
                    <p className="text-2xl font-bold text-green-500">{attendanceData.totalAttendance}</p>
                  </div>
                  <div className="dark-card p-4">
                    <h3 className="text-gray-400 text-xs mb-1">Attendance Rate</h3>
                    <p className="text-2xl font-bold text-purple-500">{attendanceData.attendanceRate}</p>
                  </div>
                  <div className="dark-card p-4">
                    <h3 className="text-gray-400 text-xs mb-1">Not Yet Scanned</h3>
                    <p className="text-2xl font-bold text-orange-500">
                      {attendanceData.totalRegistrations - attendanceData.totalAttendance}
                    </p>
                  </div>
                </div>
              )}

              {/* Recent Scans */}
              <div className="dark-card p-5">
                <h2 className="text-lg font-bold text-white mb-3">Recent Scans</h2>
                <div className="overflow-y-auto space-y-2" style={{ maxHeight: '380px' }}>
                  {attendanceData && attendanceData.attendanceRecords.length > 0 ? (
                    attendanceData.attendanceRecords
                      .slice()
                      .sort((a, b) => new Date(b.scannedAt) - new Date(a.scannedAt))
                      .map((record, index) => (
                        <div key={index} className="p-3 bg-dark-200 border border-primary-900 rounded-lg flex justify-between items-center">
                          <div>
                            <p className="font-semibold text-gray-200 text-sm">{record.participant.name}</p>
                            <p className="text-xs text-gray-400">{record.participant.email}</p>
                            <p className="text-xs text-gray-500">{new Date(record.scannedAt).toLocaleString()}</p>
                          </div>
                          <div className="text-right shrink-0 ml-2">
                            <span className={`text-xs px-2 py-1 rounded ${record.scanMethod === 'QR_SCAN' ? 'bg-primary-900 text-primary-300' : 'bg-yellow-900 text-yellow-300'}`}>
                              {record.scanMethod === 'QR_SCAN' ? 'QR Scan' : 'Manual'}
                            </span>
                            {record.notes && <p className="text-xs text-gray-500 mt-1">{record.notes}</p>}
                          </div>
                        </div>
                      ))
                  ) : (
                    <p className="text-gray-400 text-center py-8">No attendance records yet</p>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
};

export default QRScanner;
