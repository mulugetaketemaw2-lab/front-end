import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { ethToGre, greToEth, formatEthDate, ETHIOPIAN_MONTHS } from "../utils/ethiopianDate";

const Attendance = ({ token, currentUser }) => {
    const isExec = ['super_admin', 'admin', 'sebsabi', 'meketel_sebsabi', 'tsehafy', 'timhirt', 'abalat_guday', 'mezmur', 'bach', 'muya', 'lmat', 'kwanqwa', 'merja', 'hisab', 'audit'].includes(currentUser?.role);
    // targetsUsers means the user is taking attendance FOR other Staff/Users (Board or Sub-execs)
    const targetsUsers = ['super_admin', 'admin', 'tsehafy', 'sebsabi', 'meketel_sebsabi', 'timhirt', 'abalat_guday', 'mezmur', 'bach', 'muya', 'lmat', 'kwanqwa', 'merja', 'hisab', 'audit'].includes(currentUser?.role);
    // targetsMembers means the user is taking attendance FOR normal Members (Subgroups)
    const targetsMembers = currentUser?.role === 'sub_executive';
    
    // For specific UI/Role logic
    const isAdmin = ['super_admin', 'admin', 'sebsabi', 'meketel_sebsabi', 'tsehafy'].includes(currentUser?.role);
    const isDeptHead = ['timhirt', 'abalat_guday', 'mezmur', 'bach', 'muya', 'lmat', 'kwanqwa', 'merja', 'hisab', 'audit'].includes(currentUser?.role);
    const canManageMeetings = isAdmin || isDeptHead;
    
    const formatDateToYYYYMMDD = (d) => {
        if (!d) return "";
        const dateObj = new Date(d);
        const y = dateObj.getFullYear();
        const m = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };

    const [members, setMembers] = useState([]);
    const [date, setDate] = useState(formatDateToYYYYMMDD(new Date()));
    const [useEthCalendar, setUseEthCalendar] = useState(true);
    const [ethDate, setEthDate] = useState({ 
        day: greToEth(new Date()).day, 
        month: greToEth(new Date()).month, 
        year: greToEth(new Date()).year 
    });
    const [attendances, setAttendances] = useState({});
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterBatch, setFilterBatch] = useState("");
    const [availableTerms, setAvailableTerms] = useState([]);
    const [selectedTerm, setSelectedTerm] = useState("");
    
    // New state for enhanced features
    const [activeTab, setActiveTab] = useState('all'); // all, present, absent, unrecorded
    const [attendanceType, setAttendanceType] = useState('learning'); // learning or meeting
    const [showSidebar, setShowSidebar] = useState(false);
    const [sidebarFilter, setSidebarFilter] = useState('present'); // present, absent, unrecorded
    const [sidebarType, setSidebarType] = useState('learning');

    // Executive Meeting Specific State
    const [meeting, setMeeting] = useState(null);
    const [meetingTitle, setMeetingTitle] = useState("");
    const [meetingAgenda, setMeetingAgenda] = useState("");
    const [isSavingMeeting, setIsSavingMeeting] = useState(false);
    const [isDeletingMeeting, setIsDeletingMeeting] = useState(false);
    const [meetingHistory, setMeetingHistory] = useState([]);
    const [showHistory, setShowHistory] = useState(false);
    const [selectedMeetingId, setSelectedMeetingId] = useState(null);
    const [historyMonth, setHistoryMonth] = useState("all");
    const [absenceStats, setAbsenceStats] = useState({});

    // Monthly totals for history
    const historyTotals = useMemo(() => {
        let p = 0;
        let a = 0;
        meetingHistory.forEach(m => {
            const mEth = greToEth(new Date(m.date));
            if (historyMonth === "all" || String(mEth.month) === String(historyMonth)) {
                p += (m.presentCount || 0);
                a += (m.absentCount || 0);
            }
        });
        return { present: p, absent: a };
    }, [meetingHistory, historyMonth]);

    // Default to meeting for secretary/admin
    useEffect(() => {
        if (targetsUsers) {
            setAttendanceType('meeting');
            setSidebarType('meeting');
        } else {
            setAttendanceType('learning');
            setSidebarType('learning');
        }
    }, [targetsUsers]);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            const [settingsRes, termsRes] = await Promise.all([
                axios.get('/settings'),
                axios.get('/settings/terms')
            ]);
            if (settingsRes.data.currentTerm) {
                setSelectedTerm(settingsRes.data.currentTerm);
            }
            if (termsRes.data.success) {
                setAvailableTerms(termsRes.data.terms);
            }
        } catch (err) {
            console.error("Error fetching initial settings:", err);
        }
    };

    useEffect(() => {
        if (selectedTerm) {
            fetchData(selectedTerm);
        }
    }, [date, selectedTerm]);

    // Sync EC to GC
    useEffect(() => {
        if (useEthCalendar && ethDate.day && ethDate.month && ethDate.year) {
            try {
                const gcDate = ethToGre(parseInt(ethDate.day), parseInt(ethDate.month), parseInt(ethDate.year));
                setDate(formatDateToYYYYMMDD(gcDate));
            } catch (err) {
                console.warn("Invalid EC date");
            }
        }
    }, [ethDate, useEthCalendar]);

    const fetchData = async (termParam) => {
        setLoading(true);
        try {
            const termToUse = termParam || selectedTerm;
            const termQuery = termToUse ? `&term=${encodeURIComponent(termToUse)}` : '';
            
            // Secretary/Board/Dept Head fetch Users (Staff), Sub-execs fetch Members
            const membersUrl = targetsUsers ? `/auth/users?showAll=false${termQuery}` : `/members?term=${encodeURIComponent(termToUse || '')}`;
            
            const [membersRes, attRes] = await Promise.all([
                axios.get(membersUrl, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`/attendance/${date}`, { headers: { Authorization: `Bearer ${token}` } })
            ]);

            let fetchedMembers = membersRes.data;
            
            // If fetching Users (Staff), filter for Secretary's Board View or use all for Dept Head (Sub-execs)
            if (targetsUsers) {
                if (isAdmin) {
                    // Secretary marks the Board (13 Executive Positions)
                    const boardRoles = ['sebsabi', 'meketel_sebsabi', 'tsehafy', 'timhirt', 'abalat_guday', 'mezmur', 'bach', 'muya', 'lmat', 'kwanqwa', 'merja', 'hisab', 'audit'];
                    
                    // Filter for board roles and then ensure only one person per role (Unique by Role)
                    const uniqueBoardMembers = [];
                    const seenRoles = new Set();
                    
                    fetchedMembers.forEach(user => {
                        if (boardRoles.includes(user.role) && user.isActive !== false && !seenRoles.has(user.role)) {
                            uniqueBoardMembers.push(user);
                            seenRoles.add(user.role);
                        }
                    });
                    
                    fetchedMembers = uniqueBoardMembers;
                    console.log(`✅ Filtered to ${fetchedMembers.length} unique board members for Secretary`);
                }
                // Dept Heads (isDeptHead but not isAdmin) already get filtered to sub_executives by Backend
            }
            
            setMembers(fetchedMembers);
            
            const attMap = {};
            attRes.data.forEach(att => {
                const key = `${att.member?._id || att.member}-${att.type}`;
                attMap[key] = att;
            });
            setAttendances(attMap);

            // Fetch Executive/Department Meeting if applicable
            if (canManageMeetings) {
                try {
                    let m = null;
                    if (selectedMeetingId) {
                        const mRes = await axios.get(`/executiveMeetings/${selectedMeetingId}`, { headers: { Authorization: `Bearer ${token}` } });
                        m = mRes.data.meeting;
                    } else {
                        // For board, look for executive type; for dept heads, the backend filters automatically but we can specify type=department
                        const mType = isAdmin ? 'executive' : 'department';
                        const meetingsRes = await axios.get(`/executiveMeetings?type=${mType}&date=${date}`, { headers: { Authorization: `Bearer ${token}` } });
                        if (meetingsRes.data.length > 0) {
                            m = meetingsRes.data[0];
                        }
                    }

                    if (m) {
                        setMeeting(m);
                        setMeetingTitle(m.title || "");
                        setMeetingAgenda(m.agenda || "");
                        
                        // If we didn't have a selectedMeetingId (initial load by date), set it now to lock it in
                        if (!selectedMeetingId) setSelectedMeetingId(m._id);
                        
                        // Fetch/Map AttendanceRecord status
                        const meetingDetails = await axios.get(`/executiveMeetings/${m._id}`, { headers: { Authorization: `Bearer ${token}` } });
                        if (meetingDetails.data.attendance) {
                            const meetingAttMap = { ...attMap };
                            meetingDetails.data.attendance.forEach(rec => {
                                const key = `${rec.userId._id || rec.userId}-meeting`;
                                meetingAttMap[key] = { 
                                    _id: rec._id, 
                                    status: rec.status.toLowerCase(),
                                    isMeetingRecord: true // tag for identification
                                };
                            });
                            setAttendances(meetingAttMap);
                        }
                    } else {
                        setMeeting(null);
                        setMeetingTitle("");
                        setMeetingAgenda("");
                    }
                } catch (err) {
                    console.error("Error fetching meeting details:", err);
                }

                // Fetch cumulative absences for board members
                try {
                    const absRes = await axios.get(`/executiveMeetings/stats/absences?term=${termToUse}`, { headers: { Authorization: `Bearer ${token}` } });
                    setAbsenceStats(absRes.data);
                } catch (e) {
                    console.error("Error fetching cumulative absences:", e);
                }
            }
        } catch (err) {
            console.error("Error fetching data:", err);
            toast.error("መረጃ ማግኘት አልተቻለም (Failed to load data)");
        } finally {
            setLoading(false);
        }
    };

    const markAttendance = async (memberId, type, status) => {
        try {
            const key = `${memberId}-${type}`;
            const existing = attendances[key];
            
            // If it's an executive/department meeting, use the executiveMeetings API
            if (canManageMeetings && type === 'meeting') {
                let currentMeetingId = meeting?._id;
                
                // If no meeting exists yet, we must have a title/agenda to create one
                if (!currentMeetingId) {
                    if (!meetingTitle.trim() || !meetingAgenda.trim()) {
                        toast.error("እባክዎ መጀመሪያ ስብሰባውን ይመዝግቡ (Please enter title and agenda first)");
                        return;
                    }
                    
                    const newMeeting = await axios.post("/executiveMeetings", {
                        title: meetingTitle,
                        agenda: meetingAgenda,
                        date: date,
                        time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
                        type: isAdmin ? 'executive' : 'department'
                    }, { headers: { Authorization: `Bearer ${token}` } });
                    
                    currentMeetingId = newMeeting.data._id;
                    setMeeting(newMeeting.data);
                }
                
                // Save attendance record
                const res = await axios.post(`/executiveMeetings/${currentMeetingId}/attendance`, {
                    attendees: [{ userId: memberId, status: status.charAt(0).toUpperCase() + status.slice(1) }],
                    term: selectedTerm
                }, { headers: { Authorization: `Bearer ${token}` } });
                
                setAttendances(prev => ({ 
                    ...prev, 
                    [key]: { status: status.toLowerCase(), isMeetingRecord: true, meetingId: currentMeetingId } 
                }));
                return;
            }

            // Fallback to simple attendance system for non-execs or learning
            if (existing && !existing.isMeetingRecord) {
                const res = await axios.put(`/attendance/${existing._id}`, { status }, { headers: { Authorization: `Bearer ${token}` } });
                setAttendances(prev => ({ ...prev, [key]: res.data }));
            } else {
                const res = await axios.post("/attendance", { 
                    memberId, 
                    date, 
                    type, 
                    status, 
                    onModel: targetsUsers ? "User" : "Member",
                    term: selectedTerm 
                }, { headers: { Authorization: `Bearer ${token}` } });
                setAttendances(prev => ({ ...prev, [key]: res.data }));
            }
        } catch (err) {
            toast.error("መመዝገብ አልተቻለም (Error marking attendance)");
        }
    };

    const handleDeleteMeeting = async () => {
        if (!meeting?._id) return;
        if (!window.confirm("ይህንን ስብሰባ ሙሉ በሙሉ ለማጥፋት እርግጠኛ ነዎት? (Are you sure you want to delete this meeting?)")) return;
        
        setIsDeletingMeeting(true);
        try {
            await axios.delete(`/executiveMeetings/${meeting._id}`, { headers: { Authorization: `Bearer ${token}` } });
            toast.success("ስብሰባው በትክክል ጠፍቷል (Meeting deleted)");
            setMeeting(null);
            setMeetingTitle("");
            setMeetingAgenda("");
            // Clear attendance states for meeting type
            const newAtts = { ...attendances };
            Object.keys(newAtts).forEach(key => {
                if (key.endsWith('-meeting')) delete newAtts[key];
            });
            setAttendances(newAtts);
            if (showHistory) fetchMeetingHistory();
        } catch (err) {
            toast.error("ማጥፋት አልተቻለም (Delete failed)");
        } finally {
            setIsDeletingMeeting(false);
        }
    };

    const fetchMeetingHistory = async () => {
        try {
            const res = await axios.get('/executiveMeetings?type=executive', { headers: { Authorization: `Bearer ${token}` } });
            setMeetingHistory(res.data);
        } catch (err) {
            console.error("Error fetching history:", err);
        }
    };

    const selectMeetingFromHistory = (m) => {
        setSelectedMeetingId(m._id);
        setMeeting(m);
        setMeetingTitle(m.title || "");
        setMeetingAgenda(m.agenda || "");
        
        // Convert the meeting date to GC string for the state using the safe formatter
        const mDate = formatDateToYYYYMMDD(new Date(m.date));
        setDate(mDate);
        
        // Update ethDate state to match
        const eth = greToEth(new Date(m.date));
        setEthDate({ day: eth.day, month: eth.month, year: eth.year });
        
        setShowHistory(false);
    };

    const handleUpdateMeetingHeader = async () => {
        if (!meetingTitle.trim() || !meetingAgenda.trim()) {
            toast.error("እባክዎ ርዕስ እና አጀንዳ ያስገቡ (Please enter title and agenda)");
            return;
        }
        
        setIsSavingMeeting(true);
        try {
            if (meeting) {
                const res = await axios.put(`/executiveMeetings/${meeting._id}`, {
                    title: meetingTitle,
                    agenda: meetingAgenda
                }, { headers: { Authorization: `Bearer ${token}` } });
                setMeeting(res.data);
                toast.success("የስብሰባ መረጃ ተሻሽሏል (Meeting updated)");
            } else {
                const res = await axios.post("/executiveMeetings", {
                    title: meetingTitle,
                    agenda: meetingAgenda,
                    date: date,
                    time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
                    type: isAdmin ? 'executive' : 'department'
                }, { headers: { Authorization: `Bearer ${token}` } });
                setMeeting(res.data);
                toast.success("ስብሰባ ተመዝግቧል (Meeting created)");
            }
        } catch (err) {
            toast.error("መመዝገብ አልተቻለም");
        } finally {
            setIsSavingMeeting(false);
        }
    };

    const markAllPresent = async (type) => {
        setLoading(true);
        try {
            if (canManageMeetings && type === 'meeting') {
                let currentMeetingId = meeting?._id;
                
                if (!currentMeetingId) {
                    if (!meetingTitle.trim() || !meetingAgenda.trim()) {
                        toast.error("እባክዎ መጀመሪያ ስብሰባውን ይመዝግቡ (Please enter title and agenda first)");
                        setLoading(false);
                        return;
                    }
                    
                    const newMeeting = await axios.post("/executiveMeetings", {
                        title: meetingTitle,
                        agenda: meetingAgenda,
                        date: date,
                        time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
                        type: isAdmin ? 'executive' : 'department'
                    }, { headers: { Authorization: `Bearer ${token}` } });
                    
                    currentMeetingId = newMeeting.data._id;
                    setMeeting(newMeeting.data);
                }

                const attendees = filteredMembers.map(m => ({
                    userId: m._id,
                    status: 'Present'
                }));

                await axios.post(`/executiveMeetings/${currentMeetingId}/attendance`, {
                    attendees,
                    term: selectedTerm
                }, { headers: { Authorization: `Bearer ${token}` } });

                const newAtts = { ...attendances };
                filteredMembers.forEach(m => {
                    newAtts[`${m._id}-meeting`] = { status: 'present', isMeetingRecord: true, meetingId: currentMeetingId };
                });
                setAttendances(newAtts);
                toast.success("ሁሉንም 'ተገኝተዋል' ተብለዋል (All marked as present)");
            } else {
                await Promise.all(filteredMembers.map(m => markAttendance(m._id, type, 'present')));
                toast.success("ሁሉንም 'ተገኝተዋል' ተብለዋል (All marked as present)");
            }
        } catch (err) {
            toast.error("መመዝገብ አልተቻለም");
        } finally {
            setLoading(false);
        }
    };

    // Base filter: name + batch
    const baseFiltered = members.filter(m => {
        const fullNm = m.name || `${m.firstName || ''} ${m.fatherName || ''}`;
        let batchMatch = true;
        if (filterBatch) {
            batchMatch = isAdmin ? (m.department === filterBatch) : (m.batch === filterBatch);
        }
        return fullNm.toLowerCase().includes(searchTerm.toLowerCase()) && batchMatch;
    });

    // Computed attendance lists
    const computedLists = useMemo(() => {
        const present = { learning: [], meeting: [] };
        const absent = { learning: [], meeting: [] };
        const excused = { learning: [], meeting: [] };
        const unrecorded = { learning: [], meeting: [] };

        baseFiltered.forEach(m => {
            ['learning', 'meeting'].forEach(type => {
                const status = attendances[`${m._id}-${type}`]?.status;
                if (status === 'present') present[type].push(m);
                else if (status === 'absent') absent[type].push(m);
                else if (status === 'excused') excused[type].push(m);
                else unrecorded[type].push(m);
            });
        });

        return { present, absent, excused, unrecorded };
    }, [baseFiltered, attendances]);

    // Tab-based filtering
    const filteredMembers = useMemo(() => {
        if (activeTab === 'all') return baseFiltered;
        if (activeTab === 'present') return computedLists.present[attendanceType];
        if (activeTab === 'absent') return computedLists.absent[attendanceType];
        if (activeTab === 'excused') return computedLists.excused[attendanceType];
        if (activeTab === 'unrecorded') return computedLists.unrecorded[attendanceType];
        return baseFiltered;
    }, [activeTab, baseFiltered, computedLists, attendanceType]);

    const batches = [...new Set(members.map(m => isAdmin ? m.department : m.batch).filter(Boolean))].sort();
    const currentEth = greToEth(date);

    // Stats
    const totalMembers = baseFiltered.length;
    const lPresent = computedLists.present.learning.length;
    const lAbsent = computedLists.absent.learning.length;
    const lExcused = computedLists.excused.learning.length;
    const lUnrecorded = computedLists.unrecorded.learning.length;
    const mPresent = computedLists.present.meeting.length;
    const mAbsent = computedLists.absent.meeting.length;
    const mExcused = computedLists.excused.meeting.length;
    const mUnrecorded = computedLists.unrecorded.meeting.length;
    const lRate = totalMembers ? Math.round((lPresent / totalMembers) * 100) : 0;
    const mRate = totalMembers ? Math.round((mPresent / totalMembers) * 100) : 0;

    // Open sidebar with a specific filter
    const openSidebar = (filter, type) => {
        setSidebarFilter(filter);
        setSidebarType(type);
        setShowSidebar(true);
    };

    const sidebarMembers = useMemo(() => {
        return computedLists[sidebarFilter]?.[sidebarType] || [];
    }, [computedLists, sidebarFilter, sidebarType]);

    const sidebarTitle = {
        present: '✅ Present',
        absent: '❌ Absent',
        unrecorded: '⏳ Unrecorded'
    };

    const sidebarTypeLabel = {
        learning: '📖 Learning',
        meeting: '🤝 Meeting'
    };

    // Export attendance to CSV
    const exportCSV = () => {
        const headers = ['Name', isAdmin ? 'Department' : 'Batch', 'Learning Status', 'Meeting Status'];
        const rows = baseFiltered.map(m => {
            const name = m.name || `${m.firstName} ${m.fatherName}`;
            const group = isAdmin ? (m.department || '') : (m.batch || '');
            const lStat = attendances[`${m._id}-learning`]?.status || 'unrecorded';
            const mStat = attendances[`${m._id}-meeting`]?.status || 'unrecorded';
            return [name, group, lStat, mStat].join(',');
        });
        const csv = [headers.join(','), ...rows].join('\n');
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const ethDateStr = `${currentEth.year}-${currentEth.month}-${currentEth.day}`;
        a.download = `attendance_${ethDateStr}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('CSV exported successfully!');
    };

    const getMemberName = (m) => m.name || `${m.firstName || ''} ${m.fatherName || ''}`;

    return (
        <div className="att-page">
            {/* ── Hero Banner ─────────────────────────────── */}
            <div className="att-hero">
                <div className="att-hero-bg"></div>
                <div className="att-hero-content">
                    <div className="att-hero-left">
                        <div className="att-hero-icon">📋</div>
                        <div>
                            <h1 className="att-hero-title">የመገኘት መዝገብ</h1>
                            <p className="att-hero-sub">Attendance Record • {currentEth.monthAmharic} {currentEth.day}, {currentEth.year} ዓ.ም</p>
                        </div>
                    </div>

                    {/* Moved Stats Dashboard Inside Hero */}
                    <div className="att-hero-stats">
                        {/* Total Members */}
                        <div className="att-stat-mini">
                            <span className="att-mini-icon">👥</span>
                            <div className="att-mini-data">
                                <div className="att-mini-num">{totalMembers}</div>
                                <div className="att-mini-label">{canManageMeetings ? 'Total Personnel' : 'Total Registered'}</div>
                            </div>
                        </div>

                        {/* Learning Block (Hidden for Admin/Execs) */}
                        {!isExec && (
                            <div className="att-stat-mini">
                                <span className="att-mini-icon">📖</span>
                                <div className="att-mini-data">
                                    <div className="att-mini-header">
                                        <span className="att-mini-label">Learning</span>
                                        <span className="att-mini-rate">{lRate}%</span>
                                    </div>
                                    <div className="att-mini-items">
                                        <span className="att-mini-item s-present" onClick={() => openSidebar('present', 'learning')} title="Present">P: {lPresent}</span>
                                        <span className="att-mini-item s-absent" onClick={() => openSidebar('absent', 'learning')} title="Absent">A: {lAbsent}</span>
                                        <span className="att-mini-item s-excused" onClick={() => openSidebar('excused', 'learning')} title="Permission">E: {lExcused}</span>
                                        <span className="att-mini-item s-unrecorded" onClick={() => openSidebar('unrecorded', 'learning')} title="Unrecorded">U: {lUnrecorded}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Meeting Block */}
                        <div className="att-stat-mini">
                            <span className="att-mini-icon">🤝</span>
                            <div className="att-mini-data">
                                <div className="att-mini-header">
                                    <span className="att-mini-label">Meeting</span>
                                    <span className="att-mini-rate">{mRate}%</span>
                                </div>
                                <div className="att-mini-items">
                                    <span className="att-mini-item s-present" onClick={() => openSidebar('present', 'meeting')} title="Present">P: {mPresent}</span>
                                    <span className="att-mini-item s-absent" onClick={() => openSidebar('absent', 'meeting')} title="Absent">A: {mAbsent}</span>
                                    <span className="att-mini-item s-excused" onClick={() => openSidebar('excused', 'meeting')} title="Permission">E: {mExcused}</span>
                                    <span className="att-mini-item s-unrecorded" onClick={() => openSidebar('unrecorded', 'meeting')} title="Unrecorded">U: {mUnrecorded}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="att-hero-right">
                        <div className="att-date-card" style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
                            <div className="att-date-header">
                                <span className="att-date-label">📅 Select Date</span>
                                <label className="att-ec-toggle">
                                    <input type="checkbox" checked={useEthCalendar} onChange={e => setUseEthCalendar(e.target.checked)} />
                                    <span className="att-ec-slider"></span>
                                    <span className="att-ec-text">EC</span>
                                </label>
                            </div>
                            {useEthCalendar ? (
                                <div className="att-date-inputs">
                                    <select 
                                        value={ethDate.month} 
                                        onChange={e => { setSelectedMeetingId(null); setEthDate(p => ({ ...p, month: e.target.value })); }}
                                        className="att-date-select"
                                    >
                                        {ETHIOPIAN_MONTHS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                    </select>
                                    <input 
                                        type="number" 
                                        value={ethDate.day}
                                        onChange={e => { setSelectedMeetingId(null); setEthDate(p => ({ ...p, day: e.target.value })); }}
                                        min="1" max="31"
                                        className="att-date-num"
                                    />
                                    <input 
                                        type="number" 
                                        value={ethDate.year}
                                        onChange={e => { setSelectedMeetingId(null); setEthDate(p => ({ ...p, year: e.target.value })); }}
                                        className="att-date-num att-date-year"
                                    />
                                </div>
                            ) : (
                                <input 
                                    type="date" 
                                    value={date} 
                                    onChange={(e) => { setSelectedMeetingId(null); setDate(e.target.value); }}
                                    className="att-date-gc"
                                />
                            )}
                            <div className="att-date-gc-label">ኢትዮጵያ ቀን: {formatEthDate(date)}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Executive/Department Meeting Agenda Section ────────── */}
            {canManageMeetings && (
                <div className="att-agenda-card animate-slide-up" style={{ marginBottom: '20px' }}>
                    <div className="att-agenda-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '1.5rem' }}>🎯</span>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '900', color: '#1e293b' }}>
                                    የስብሰባ አጀንዳ (Meeting Agenda)
                                    {meeting?.time && <span style={{ marginLeft: '10px', fontSize: '0.8rem', color: '#3b82f6', background: '#eff6ff', padding: '2px 8px', borderRadius: '6px' }}>🕒 {meeting.time}</span>}
                                </h3>
                                <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>ለዛሬው ስብሰባ ርዕስ እና ዋና አጀንዳዎችን እዚህ ያስገቡ።</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                                className="att-history-toggle-btn"
                                onClick={() => { setShowHistory(true); fetchMeetingHistory(); }}
                                title="የቀድሞ ስብሰባዎች ዝርዝር"
                            >
                                📜 History
                            </button>
                            {meeting && (
                                <button 
                                    className={`att-delete-btn ${isDeletingMeeting ? 'loading' : ''}`}
                                    onClick={handleDeleteMeeting}
                                    disabled={isDeletingMeeting}
                                    title="ስብሰባውን አጥፋ"
                                >
                                    {isDeletingMeeting ? '...' : '🗑️ Delete'}
                                </button>
                            )}
                            <button 
                                className={`att-save-header-btn ${isSavingMeeting ? 'loading' : ''}`}
                                onClick={handleUpdateMeetingHeader}
                                disabled={isSavingMeeting}
                            >
                                {isSavingMeeting ? '...' : (meeting ? '✅ Update' : '💾 Save')}
                            </button>
                        </div>
                    </div>
                    <div className="att-agenda-body">
                        <div className="att-input-group">
                            <label>የስብሰባው ርዕስ (Meeting Title)</label>
                            <textarea 
                                value={meetingTitle}
                                onChange={e => setMeetingTitle(e.target.value)}
                                className="att-agenda-title-input"
                                rows="2"
                            ></textarea>
                        </div>
                        <div className="att-input-group">
                            <label>የመወያያ አርዕስት (Discussion Points / Agenda)</label>
                            <textarea 
                                value={meetingAgenda}
                                onChange={e => setMeetingAgenda(e.target.value)}
                                className="att-agenda-text-input"
                                rows="3"
                            ></textarea>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Term Selector ──────────────────────────── */}
            <div className="att-term-bar">
                <div className="att-term-left">
                    <span className="att-term-icon">🗓️</span>
                    <span className="att-term-label">Year:</span>
                    <select className="att-term-select" value={selectedTerm} onChange={(e) => setSelectedTerm(e.target.value)}>
                        {availableTerms.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                <div className="att-term-actions">
                    {selectedTerm && availableTerms.length > 0 && selectedTerm !== availableTerms[0] && (
                        <span className="att-history-badge">📜 Historical Data</span>
                    )}
                    <button onClick={exportCSV} className="att-export-btn" title="Export CSV">
                        📥 Export
                    </button>
                </div>
            </div>

            {/* ── Controls & Tabs ────────────────────────── */}
            <div className="att-controls">
                <div className="att-search-group">
                    <div className="att-search-wrap">
                        <span className="att-search-icon">🔍</span>
                        <input 
                            type="text" 
                            placeholder="Search by name..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="att-search-input"
                        />
                        {searchTerm && (
                            <button className="att-search-clear" onClick={() => setSearchTerm('')}>✕</button>
                        )}
                    </div>
                    <select className="att-filter-select" value={filterBatch} onChange={(e) => setFilterBatch(e.target.value)}>
                        <option value="">{canManageMeetings ? 'All Departments' : 'All Batches'}</option>
                        {batches.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                </div>
                <div className="att-action-group">
                    {!isExec && (
                        <button onClick={() => markAllPresent('learning')} className="att-mark-all att-mark-learning">
                            📖 All Present
                        </button>
                    )}
                    <button onClick={() => markAllPresent('meeting')} className="att-mark-all att-mark-meeting">
                        🤝 All Present
                    </button>
                    <button onClick={() => fetchData()} className="att-refresh-btn" title="Refresh">🔄</button>
                </div>
            </div>

            {/* ── Tabs ───────────────────────────────────── */}
            <div className="att-tabs-bar">
                <div className="att-tabs">
                    <button className={`att-tab ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>
                        All <span className="att-tab-count">{baseFiltered.length}</span>
                    </button>
                    <button className={`att-tab att-tab-green ${activeTab === 'present' ? 'active' : ''}`} onClick={() => setActiveTab('present')}>
                        ✅ Present <span className="att-tab-count">{computedLists.present[attendanceType].length}</span>
                    </button>
                    <button className={`att-tab att-tab-red ${activeTab === 'absent' ? 'active' : ''}`} onClick={() => setActiveTab('absent')}>
                        ❌ Absent <span className="att-tab-count">{computedLists.absent[attendanceType].length}</span>
                    </button>
                    <button className={`att-tab att-tab-yellow ${activeTab === 'excused' ? 'active' : ''}`} onClick={() => setActiveTab('excused')}>
                        ★ Permission <span className="att-tab-count">{computedLists.excused[attendanceType].length}</span>
                    </button>
                    <button className={`att-tab att-tab-orange ${activeTab === 'unrecorded' ? 'active' : ''}`} onClick={() => setActiveTab('unrecorded')}>
                        ⏳ Unrecorded <span className="att-tab-count">{computedLists.unrecorded[attendanceType].length}</span>
                    </button>
                </div>
                {(activeTab !== 'all' && !isExec) && (
                    <div className="att-type-switch">
                        <button className={`att-type-btn ${attendanceType === 'learning' ? 'active' : ''}`} onClick={() => setAttendanceType('learning')}>📖 Learning</button>
                        <button className={`att-type-btn ${attendanceType === 'meeting' ? 'active' : ''}`} onClick={() => setAttendanceType('meeting')}>🤝 Meeting</button>
                    </div>
                )}
            </div>

            {/* ── Attendance Table ────────────────────────── */}
            <div className="att-table-card">
                <div className="att-table-wrap">
                    <table className="att-table">
                        <thead>
                            <tr>
                                <th className="att-th-idx" rowSpan="2">#</th>
                                <th className="att-th-name" rowSpan="2">
                                    <span className="att-th-text">{isAdmin ? 'Executive' : 'Student'}</span>
                                    <span className="att-th-count">{filteredMembers.length} members</span>
                                </th>
                                {!isExec && (
                                    <th colSpan="2" className="att-th-group att-th-learning">📖 Learning</th>
                                )}
                                <th colSpan={canManageMeetings ? "3" : "2"} className="att-th-group att-th-meeting">🤝 Meeting</th>
                                {canManageMeetings && (
                                    <th className="att-th-name" rowSpan="2" style={{ width: '100px', textAlign: 'center' }}>
                                        <span className="att-th-text">ቀሪ</span>
                                        <span className="att-th-count">Total Absent</span>
                                    </th>
                                )}
                            </tr>
                            <tr>
                                {!isExec && (
                                    <>
                                        <th className="att-th-sub att-th-present-l">Present</th>
                                        <th className="att-th-sub att-th-absent-l">Absent</th>
                                    </>
                                )}
                                <th className="att-th-sub att-th-present-m">Present</th>
                                <th className="att-th-sub att-th-absent-m">Absent</th>
                                {canManageMeetings && <th className="att-th-sub att-th-excused-m" style={{ background: '#fffbeb', color: '#92400e' }}>Permission</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="att-loading-cell">
                                        <div className="att-loading-spinner"></div>
                                        <span>Loading...</span>
                                    </td>
                                </tr>
                            ) : filteredMembers.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="att-empty-cell">
                                        <div className="att-empty-icon">📭</div>
                                        <span>No members found</span>
                                    </td>
                                </tr>
                            ) : (
                                filteredMembers.map((m, idx) => {
                                    const lStatus = attendances[`${m._id}-learning`]?.status;
                                    const mStatus = attendances[`${m._id}-meeting`]?.status;
                                    return (
                                        <tr key={m._id} className="att-row" style={{ animationDelay: `${Math.min(idx * 0.02, 0.5)}s` }}>
                                            <td className="att-idx-cell">{idx + 1}</td>
                                            <td className="att-name-cell">
                                                <div className="att-name-wrap">
                                                    <div className="att-avatar" style={{ background: `hsl(${(m._id?.charCodeAt(0) || 0) * 37 % 360}, 55%, 50%)` }}>
                                                        {(m.name || m.firstName)?.[0]?.toUpperCase() || 'A'}
                                                    </div>
                                                    <div className="att-name-info">
                                                        <span className="att-name-text">{getMemberName(m)}</span>
                                                        <span className="att-name-sub">
                                                            {isAdmin ? m.department : `${m.batch || ''} • ${m.gender || ''}`}
                                                        </span>
                                                    </div>
                                                    {/* Status badges */}
                                                    <div className="att-status-badges">
                                                        {lStatus === 'present' && <span className="att-badge att-badge-green" title="Learning: Present">L✓</span>}
                                                        {lStatus === 'absent' && <span className="att-badge att-badge-red" title="Learning: Absent">L✗</span>}
                                                        {mStatus === 'present' && <span className="att-badge att-badge-blue" title="Meeting: Present">M✓</span>}
                                                        {mStatus === 'absent' && <span className="att-badge att-badge-orange" title="Meeting: Absent">M✗</span>}
                                                        {mStatus === 'excused' && <span className="att-badge att-badge-yellow" style={{ background: '#fef3c7', color: '#92400e' }} title="Meeting: Permission">M★</span>}
                                                    </div>
                                                </div>
                                            </td>
                                            
                                            {/* Learning Block (Conditional for non-execs) */}
                                            {!isExec && (
                                                <>
                                                    <td className="att-btn-cell">
                                                        <button 
                                                            onClick={() => markAttendance(m._id, 'learning', 'present')}
                                                            className={`att-toggle att-toggle-present ${lStatus === 'present' ? 'active' : ''}`}
                                                        >
                                                            {lStatus === 'present' ? '✓' : '○'}
                                                        </button>
                                                    </td>
                                                    <td className="att-btn-cell">
                                                        <button 
                                                            onClick={() => markAttendance(m._id, 'learning', 'absent')}
                                                            className={`att-toggle att-toggle-absent ${lStatus === 'absent' ? 'active' : ''}`}
                                                        >
                                                            {lStatus === 'absent' ? '✗' : '○'}
                                                        </button>
                                                    </td>
                                                </>
                                            )}

                                            {/* Meeting Block */}
                                            <td className="att-btn-cell">
                                                <button 
                                                    onClick={() => markAttendance(m._id, 'meeting', 'present')}
                                                    className={`att-toggle att-toggle-present ${mStatus === 'present' ? 'active' : ''}`}
                                                >
                                                    {mStatus === 'present' ? '✓' : '○'}
                                                </button>
                                            </td>
                                            <td className="att-btn-cell">
                                                <button 
                                                    onClick={() => markAttendance(m._id, 'meeting', 'absent')}
                                                    className={`att-toggle att-toggle-absent ${mStatus === 'absent' ? 'active' : ''}`}
                                                >
                                                    {mStatus === 'absent' ? '✗' : '○'}
                                                </button>
                                            </td>
                                            
                                            {/* Management Specific: Permission and Stats */}
                                            {canManageMeetings && (
                                                <>
                                                    <td className="att-btn-cell">
                                                        <button 
                                                            onClick={() => markAttendance(m._id, 'meeting', 'excused')}
                                                            className={`att-toggle att-toggle-excused ${mStatus === 'excused' ? 'active' : ''}`}
                                                            title="Mark as Permission (ፈቃድ)"
                                                        >
                                                            {mStatus === 'excused' ? '★' : 'P'}
                                                        </button>
                                                    </td>
                                                    <td style={{ textAlign: 'center', minWidth: '80px' }}>
                                                        <span style={{ 
                                                            fontSize: '0.85rem', 
                                                            color: (absenceStats[m._id] || 0) > 3 ? '#ef4444' : '#64748b',
                                                            fontWeight: '900',
                                                            display: 'inline-block',
                                                            padding: '4px 8px',
                                                            background: (absenceStats[m._id] || 0) > 3 ? '#fee2e2' : '#f8fafc',
                                                            borderRadius: '6px',
                                                            border: (absenceStats[m._id] || 0) > 3 ? '1px solid #fca5a5' : '1px solid #e2e8f0'
                                                        }}>
                                                            {absenceStats[m._id] || 0}
                                                        </span>
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Sidebar Panel (Member List Drawer) ──────── */}
            {showSidebar && (
                <div className="att-sidebar-overlay" onClick={() => setShowSidebar(false)}>
                    <div className="att-sidebar" onClick={e => e.stopPropagation()}>
                        <div className="att-sidebar-header">
                            <div>
                                <h3 className="att-sidebar-title">{sidebarTitle[sidebarFilter]}</h3>
                                <p className="att-sidebar-sub">{sidebarTypeLabel[sidebarType]} • {sidebarMembers.length} members</p>
                            </div>
                            <button className="att-sidebar-close" onClick={() => setShowSidebar(false)}>✕</button>
                        </div>
                        <div className="att-sidebar-tabs" style={{ display: isExec ? 'none' : 'flex' }}>
                            <button className={`att-sidebar-tab ${sidebarType === 'learning' ? 'active' : ''}`} onClick={() => setSidebarType('learning')}>📖 Learning</button>
                            <button className={`att-sidebar-tab ${sidebarType === 'meeting' ? 'active' : ''}`} onClick={() => setSidebarType('meeting')}>🤝 Meeting</button>
                        </div>
                        <div className="att-sidebar-filter-row">
                            <button className={`att-sfbtn ${sidebarFilter === 'present' ? 'att-sfbtn-green' : ''}`} onClick={() => setSidebarFilter('present')}>
                                ✅ Present ({computedLists.present[sidebarType].length})
                            </button>
                            <button className={`att-sfbtn ${sidebarFilter === 'absent' ? 'att-sfbtn-red' : ''}`} onClick={() => setSidebarFilter('absent')}>
                                ❌ Absent ({computedLists.absent[sidebarType].length})
                            </button>
                            <button className={`att-sfbtn ${sidebarFilter === 'excused' ? 'att-sfbtn-yellow' : ''}`} onClick={() => setSidebarFilter('excused')}>
                                ★ Permission ({computedLists.excused[sidebarType].length})
                            </button>
                            <button className={`att-sfbtn ${sidebarFilter === 'unrecorded' ? 'att-sfbtn-gray' : ''}`} onClick={() => setSidebarFilter('unrecorded')}>
                                ⏳ Unrecorded ({computedLists.unrecorded[sidebarType].length})
                            </button>
                        </div>
                        <div className="att-sidebar-list">
                            {sidebarMembers.length === 0 ? (
                                <div className="att-sidebar-empty">No members in this category</div>
                            ) : (
                                sidebarMembers.map((m, i) => (
                                    <div key={m._id} className="att-sidebar-item" style={{ animationDelay: `${i * 0.03}s` }}>
                                        <span className="att-sidebar-idx">{i + 1}</span>
                                        <div className="att-sidebar-avatar" style={{ background: `hsl(${(m._id?.charCodeAt(0) || 0) * 37 % 360}, 55%, 50%)` }}>
                                            {(m.name || m.firstName)?.[0]?.toUpperCase() || 'A'}
                                        </div>
                                        <div className="att-sidebar-member-info">
                                            <span className="att-sidebar-name">{getMemberName(m)}</span>
                                            <span className="att-sidebar-dept">{isAdmin ? m.department : (m.batch || '')}</span>
                                        </div>
                                        {sidebarFilter === 'unrecorded' && (
                                            <div className="att-sidebar-actions">
                                                <button className="att-sidebar-action-btn att-sa-present" onClick={() => markAttendance(m._id, sidebarType, 'present')} title="Mark Present">✓</button>
                                                <button className="att-sidebar-action-btn att-sa-absent" onClick={() => markAttendance(m._id, sidebarType, 'absent')} title="Mark Absent">✗</button>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Meeting History Drawer ────────────────── */}
            {showHistory && (
                <div className="att-sidebar-overlay" onClick={() => setShowHistory(false)}>
                    <div className="att-sidebar animate-slide-in-right" onClick={e => e.stopPropagation()}>
                        <div className="att-sidebar-header">
                            <div>
                                <h3 className="att-sidebar-title">📜 የስብሰባዎች ታሪክ</h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                    <select 
                                        className="att-history-month-select"
                                        value={historyMonth}
                                        onChange={e => setHistoryMonth(e.target.value)}
                                        style={{ 
                                            padding: '4px 8px', borderRadius: '8px', border: '1px solid #e2e8f0',
                                            fontSize: '0.75rem', fontWeight: '700', outline: 'none'
                                        }}
                                    >
                                        <option value="all">ሁሉም ወራት (All Months)</option>
                                        {ETHIOPIAN_MONTHS.map(m => (
                                            <option key={m.id} value={m.id}>{m.name}</option>
                                        ))}
                                    </select>
                                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: '600' }}>• {meetingHistory.length} ስብሰባዎች</span>
                                </div>
                            </div>
                            <button className="att-sidebar-close" onClick={() => setShowHistory(false)}>✕</button>
                        </div>
                        
                        {/* Monthly Summary Bar */}
                        <div style={{ padding: '12px 24px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '15px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ width: '8px', height: '8px', background: '#22c55e', borderRadius: '50%' }}></div>
                                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#1e293b' }}>ጠቅላላ የመጡ (Present)፡ {historyTotals.present}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ width: '8px', height: '8px', background: '#ef4444', borderRadius: '50%' }}></div>
                                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#1e293b' }}>ጠቅላላ የቀሩ (Absent)፡ {historyTotals.absent}</span>
                            </div>
                        </div>

                        <div className="att-sidebar-list">
                            {meetingHistory.length === 0 ? (
                                <div className="att-sidebar-empty">ምንም የተመዘገበ ስብሰባ የለም</div>
                            ) : (
                                meetingHistory
                                    .filter(m => historyMonth === "all" || String(greToEth(new Date(m.date)).month) === String(historyMonth))
                                    .map((m, i) => {
                                        const mEth = greToEth(new Date(m.date));
                                        return (
                                            <div key={m._id} className="att-history-item" onClick={() => selectMeetingFromHistory(m)} style={{ animationDelay: `${i * 0.05}s` }}>
                                                <div className="att-history-date">
                                                    <span className="att-h-day">{mEth.day}</span>
                                                    <span className="att-h-month">{mEth.monthAmharicShort || mEth.monthAmharic.slice(0,3)}</span>
                                                </div>
                                                <div className="att-history-details">
                                                    <div className="att-h-title">{m.title}</div>
                                                    <div className="att-h-agenda">{m.agenda?.substring(0, 50)}...</div>
                                                    <div className="att-h-meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                            <span>📅 {mEth.year}</span>
                                                            <span>🕒 {m.time}</span>
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '6px' }}>
                                                            <span style={{ color: '#16a34a', fontWeight: '900' }}>✓ {m.presentCount || 0}</span>
                                                            <span style={{ color: '#dc2626', fontWeight: '900' }}>✗ {m.absentCount || 0}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="att-h-arrow">→</div>
                                            </div>
                                        );
                                    })
                            )}
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                /* ── Page ──────────────────────────────────── */
                .att-page { animation: attFadeIn 0.4s ease; }
                @keyframes attFadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }

                /* ── Hero ──────────────────────────────────── */
                .att-hero {
                    position: relative; border-radius: 24px; overflow: hidden; margin-bottom: 22px; min-height: 130px;
                }
                .att-hero-bg {
                    position: absolute; inset: 0;
                    background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 40%, #0e7490 100%);
                }
                .att-hero-bg::before {
                    content: ''; position: absolute; top: -50%; right: -30%; width: 500px; height: 500px;
                    border-radius: 50%; background: radial-gradient(circle, rgba(14,165,233,0.15), transparent 70%);
                }
                .att-hero-content {
                    position: relative; z-index: 1; display: flex; align-items: center;
                    justify-content: space-between; padding: 28px 32px; gap: 20px; flex-wrap: wrap;
                }
                .att-hero-left { display: flex; align-items: center; gap: 16px; }
                .att-hero-icon {
                    width: 56px; height: 56px; background: rgba(255,255,255,0.12); backdrop-filter: blur(10px);
                    border-radius: 16px; display: flex; align-items: center; justify-content: center;
                    font-size: 26px; border: 1px solid rgba(255,255,255,0.1);
                }
                 .att-hero-title { color: #fff; font-size: 1.5rem; font-weight: 900; margin: 0; }
                .att-hero-sub { color: rgba(255,255,255,0.7); font-size: 0.82rem; margin: 3px 0 0; font-weight: 500; }

                /* ── Hero Stats (Moved) ────────────────────── */
                .att-hero-stats {
                    display: flex; gap: 20px; flex: 1; justify-content: center;
                }
                .att-stat-mini {
                    background: rgba(255,255,255,0.1); backdrop-filter: blur(10px);
                    border: 1px solid rgba(255,255,255,0.1); border-radius: 16px;
                    padding: 10px 16px; display: flex; align-items: center; gap: 12px;
                    transition: 0.25s;
                }
                .att-stat-mini:hover { background: rgba(255,255,255,0.15); transform: translateY(-2px); }
                .att-mini-icon { font-size: 1.4rem; }
                .att-mini-data { display: flex; flex-direction: column; }
                .att-mini-num { color: #fff; font-size: 1.3rem; font-weight: 900; line-height: 1; }
                .att-mini-label { color: rgba(255,255,255,0.6); font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px; }
                
                .att-mini-header { display: flex; align-items: baseline; gap: 6px; }
                .att-mini-rate { color: #22d3ee; font-weight: 900; font-size: 0.9rem; }
                .att-mini-items { display: flex; gap: 8px; margin-top: 4px; }
                .att-mini-item {
                    font-size: 0.72rem; font-weight: 800; padding: 1px 6px; border-radius: 4px; cursor: pointer; transition: 0.2s;
                }
                .att-mini-item.s-present { background: rgba(34,197,94,0.2); color: #4ade80; border: 1px solid rgba(34,197,94,0.2); }
                .att-mini-item.s-absent { background: rgba(239,68,68,0.2); color: #f87171; border: 1px solid rgba(239,68,68,0.2); }
                .att-mini-item.s-excused { background: rgba(251,191,36,0.2); color: #fbbf24; border: 1px solid rgba(251,191,36,0.2); }
                .att-mini-item.s-unrecorded { background: rgba(148,163,184,0.2); color: #cbd5e1; border: 1px solid rgba(148,163,184,0.2); }
                .att-mini-item:hover { transform: scale(1.1); filter: brightness(1.2); }

                /* ── Agenda Card ───────────────────────────── */
                .att-agenda-card {
                    background: #fff; border-radius: 20px; border: 1px solid #e2e8f0;
                    overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);
                    margin-bottom: 20px;
                }
                .att-agenda-header {
                    padding: 18px 25px; border-bottom: 1px solid #f1f5f9; display: flex;
                    justify-content: space-between; align-items: center; background: #fafbfc;
                }
                .att-agenda-body { padding: 20px 25px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                .att-input-group { display: flex; flex-direction: column; gap: 8px; }
                .att-input-group label { font-size: 0.75rem; font-weight: 800; color: #64748b; text-transform: uppercase; }
                .att-agenda-title-input, .att-agenda-text-input {
                    padding: 12px 16px; border-radius: 12px; border: 1px solid #e2e8f0;
                    font-size: 0.9rem; font-weight: 600; color: #1e293b; outline: none; transition: 0.2s;
                    width: 100%;
                }
                .att-agenda-title-input:focus, .att-agenda-text-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
                .att-agenda-title-input, .att-agenda-text-input { resize: vertical; font-family: inherit; }
                .att-save-header-btn {
                    padding: 10px 25px; border-radius: 12px; border: none; background: #0f172a;
                    color: #fff; font-weight: 800; font-size: 0.85rem; cursor: pointer; transition: 0.2s;
                }
                .att-save-header-btn:hover { background: #1e293b; transform: translateY(-1px); }
                .att-save-header-btn:active { transform: translateY(0); }
                .att-save-header-btn.loading { opacity: 0.7; cursor: not-allowed; }

                .att-delete-btn {
                    padding: 10px 18px; border-radius: 12px; border: 1px solid #fee2e2; background: #fff;
                    color: #ef4444; font-weight: 800; font-size: 0.85rem; cursor: pointer; transition: 0.2s;
                }
                .att-delete-btn:hover { background: #fef2f2; border-color: #fca5a5; transform: translateY(-1px); }
                
                .att-history-toggle-btn {
                    padding: 10px 18px; border-radius: 12px; border: 1px solid #e2e8f0; background: #fff;
                    color: #475569; font-weight: 800; font-size: 0.85rem; cursor: pointer; transition: 0.2s;
                }
                .att-history-toggle-btn:hover { background: #f8fafc; border-color: #cbd5e1; transform: translateY(-1px); }

                /* ── History Items ─────────────────────────── */
                .att-history-item {
                    display: flex; gap: 15px; padding: 16px; border-radius: 16px; 
                    background: #fff; border: 1px solid #f1f5f9; cursor: pointer;
                    transition: all 0.2s ease; margin-bottom: 12px; align-items: center;
                }
                .att-history-item:hover {
                    border-color: #3b82f6; box-shadow: 0 4px 12px rgba(59,130,246,0.08);
                    transform: translateX(5px);
                }
                .att-history-date {
                    width: 50px; height: 50px; border-radius: 12px; background: #f1f5f9;
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                    flex-shrink: 0; border: 1px solid #e2e8f0;
                }
                .att-h-day { font-size: 1.1rem; font-weight: 900; color: #1e293b; line-height: 1; }
                .att-h-month { font-size: 0.65rem; font-weight: 800; color: #64748b; text-transform: uppercase; margin-top: 2px; }
                .att-history-details { flex: 1; min-width: 0; }
                .att-h-title { font-weight: 800; font-size: 0.9rem; color: #1e293b; margin-bottom: 4px; }
                .att-h-agenda { font-size: 0.75rem; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .att-h-meta { display: flex; gap: 12px; margin-top: 6px; }
                .att-h-meta span { font-size: 0.68rem; font-weight: 600; color: #94a3b8; }
                .att-h-arrow { color: #cbd5e1; font-weight: 900; font-size: 1.1rem; }
                .att-history-item:hover .att-h-arrow { color: #3b82f6; }

                /* ── Date Card ─────────────────────────────── */
                .att-date-card {
                    background: rgba(255,255,255,0.1); backdrop-filter: blur(16px);
                    border: 1px solid rgba(255,255,255,0.15); border-radius: 16px;
                    padding: 12px 16px; min-width: 280px;
                }
                .att-date-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
                .att-date-label { color: rgba(255,255,255,0.85); font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
                .att-ec-toggle { display: flex; align-items: center; gap: 6px; cursor: pointer; color: rgba(255,255,255,0.8); font-size: 0.72rem; font-weight: 600; }
                .att-ec-toggle input { display: none; }
                .att-ec-slider {
                    width: 32px; height: 17px; background: rgba(255,255,255,0.2); border-radius: 9px;
                    position: relative; transition: 0.3s;
                }
                .att-ec-slider::before {
                    content: ''; position: absolute; left: 2px; top: 2px; width: 13px; height: 13px;
                    background: #fff; border-radius: 50%; transition: 0.3s;
                }
                .att-ec-toggle input:checked + .att-ec-slider { background: #22d3ee; }
                .att-ec-toggle input:checked + .att-ec-slider::before { transform: translateX(15px); }
                .att-ec-text { color: rgba(255,255,255,0.9); }
                .att-date-inputs { display: flex; gap: 5px; }
                .att-date-select, .att-date-num {
                    padding: 6px 8px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15);
                    background: rgba(255,255,255,0.12); color: #fff; font-size: 0.82rem; font-weight: 600; outline: none; transition: 0.2s;
                }
                .att-date-select option { background: #1e293b; color: #fff; }
                .att-date-select:focus, .att-date-num:focus { border-color: #22d3ee; box-shadow: 0 0 0 2px rgba(34,211,238,0.2); }
                .att-date-select { flex: 2; }
                .att-date-num { flex: 1; width: 45px; text-align: center; }
                .att-date-year { flex: 1.3; }
                .att-date-gc {
                    width: 100%; padding: 7px 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15);
                    background: rgba(255,255,255,0.12); color: #fff; font-size: 0.82rem; font-weight: 600; outline: none;
                }
                .att-date-gc::-webkit-calendar-picker-indicator { filter: invert(1); }
                .att-date-gc-label { font-size: 0.68rem; color: rgba(255,255,255,0.5); text-align: right; margin-top: 5px; }

                /* ── Stats Dashboard ───────────────────────── */
                .att-stats-grid {
                    display: grid; grid-template-columns: 160px 1fr 1fr; gap: 16px; margin-bottom: 18px;
                }
                .att-stat-big {
                    background: linear-gradient(145deg, #f8fafc, #fff); border-radius: 20px;
                    border: 1px solid #e2e8f0; padding: 22px 16px; text-align: center;
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                    gap: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); transition: all 0.25s;
                }
                .att-stat-big:hover { transform: translateY(-3px); box-shadow: 0 8px 25px rgba(0,0,0,0.08); }
                .att-stat-big-icon { font-size: 2rem; }
                .att-stat-big-num { font-size: 2.2rem; font-weight: 900; color: #0f172a; line-height: 1; }
                .att-stat-big-label { font-size: 0.7rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.3px; }
                
                .att-stat-block {
                    background: #fff; border-radius: 20px; border: 1px solid #e2e8f0;
                    padding: 18px 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); transition: all 0.25s;
                }
                .att-stat-block:hover { transform: translateY(-3px); box-shadow: 0 8px 25px rgba(0,0,0,0.08); }
                .att-stat-block-header { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
                .att-stat-block-emoji { font-size: 1.2rem; }
                .att-stat-block-title { font-size: 0.9rem; font-weight: 800; color: #1e293b; flex: 1; }
                .att-stat-rate {
                    font-size: 1.3rem; font-weight: 900; color: #0f172a;
                    background: #f1f5f9; padding: 4px 12px; border-radius: 10px;
                }
                .att-stat-progress {
                    height: 6px; background: #f1f5f9; border-radius: 3px; margin-bottom: 14px; overflow: hidden;
                }
                .att-stat-progress-fill { height: 100%; border-radius: 3px; transition: width 0.8s ease; }
                .att-fill-green { background: linear-gradient(90deg, #22c55e, #4ade80); }
                .att-fill-blue { background: linear-gradient(90deg, #3b82f6, #60a5fa); }
                .att-fill-red { background: linear-gradient(90deg, #ef4444, #f87171); }
                .att-fill-orange { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
                .att-stat-block-items { display: flex; gap: 8px; }
                .att-stat-item {
                    flex: 1; display: flex; align-items: center; gap: 6px;
                    padding: 10px 12px; border-radius: 12px; border: 1px solid #f1f5f9;
                    background: #fafbfc; cursor: pointer; transition: all 0.2s; font-size: 0.78rem;
                }
                .att-stat-item:hover { background: #f1f5f9; transform: translateY(-1px); box-shadow: 0 3px 8px rgba(0,0,0,0.06); }
                .att-item-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
                .att-item-label { font-weight: 600; color: #64748b; flex: 1; text-align: left; }
                .att-item-num { font-weight: 900; color: #1e293b; font-size: 0.95rem; }

                /* ── Term Bar ──────────────────────────────── */
                .att-term-bar {
                    display: flex; justify-content: space-between; align-items: center;
                    padding: 12px 20px; background: #fff; border-radius: 16px;
                    border: 1px solid #e2e8f0; margin-bottom: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);
                }
                .att-term-left { display: flex; align-items: center; gap: 10px; }
                .att-term-icon { font-size: 1rem; }
                .att-term-label { font-weight: 700; color: #475569; font-size: 0.82rem; }
                .att-term-select {
                    padding: 7px 14px; border-radius: 10px; border: 1px solid #cbd5e1;
                    font-weight: 700; font-size: 0.82rem; color: #1e293b; background: #f8fafc; cursor: pointer; outline: none;
                }
                .att-term-select:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
                .att-term-actions { display: flex; gap: 10px; align-items: center; }
                .att-history-badge {
                    font-size: 0.72rem; background: linear-gradient(135deg, #fef3c7, #fde68a);
                    color: #92400e; padding: 5px 12px; border-radius: 20px; font-weight: 700; border: 1px solid #fcd34d;
                }
                .att-export-btn {
                    padding: 7px 16px; border-radius: 10px; border: 1px solid #e2e8f0;
                    background: #fff; font-size: 0.78rem; font-weight: 700; color: #475569;
                    cursor: pointer; transition: 0.2s; display: flex; align-items: center; gap: 4px;
                }
                .att-export-btn:hover { background: #f1f5f9; border-color: #3b82f6; color: #1e293b; }

                /* ── Controls ──────────────────────────────── */
                .att-controls {
                    display: flex; justify-content: space-between; align-items: center;
                    gap: 14px; margin-bottom: 12px; flex-wrap: wrap;
                }
                .att-search-group { display: flex; gap: 10px; flex: 1; min-width: 280px; }
                .att-search-wrap { flex: 2; position: relative; display: flex; align-items: center; }
                .att-search-icon { position: absolute; left: 12px; font-size: 0.85rem; z-index: 1; pointer-events: none; }
                .att-search-input {
                    width: 100%; padding: 10px 38px 10px 36px; border-radius: 12px;
                    border: 1px solid #e2e8f0; font-size: 0.82rem; font-weight: 500;
                    background: #fff; color: #1e293b; outline: none; transition: 0.2s;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.03);
                }
                .att-search-input::placeholder { color: #94a3b8; }
                .att-search-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
                .att-search-clear {
                    position: absolute; right: 10px; background: #f1f5f9; border: none;
                    width: 20px; height: 20px; border-radius: 50%; cursor: pointer;
                    font-size: 0.65rem; color: #64748b; display: flex; align-items: center; justify-content: center;
                }
                .att-search-clear:hover { background: #e2e8f0; }
                .att-filter-select {
                    flex: 1; padding: 10px 14px; border-radius: 12px; border: 1px solid #e2e8f0;
                    font-size: 0.82rem; font-weight: 600; color: #1e293b; background: #fff;
                    cursor: pointer; outline: none; box-shadow: 0 1px 3px rgba(0,0,0,0.03);
                }
                .att-filter-select:focus { border-color: #3b82f6; }
                .att-action-group { display: flex; gap: 8px; align-items: center; }
                .att-mark-all {
                    padding: 9px 16px; border-radius: 10px; border: none;
                    font-size: 0.78rem; font-weight: 700; cursor: pointer; transition: all 0.2s; color: #fff;
                }
                .att-mark-learning { background: linear-gradient(135deg, #2563eb, #3b82f6); }
                .att-mark-learning:hover { background: linear-gradient(135deg, #1d4ed8, #2563eb); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(37,99,235,0.3); }
                .att-mark-meeting { background: linear-gradient(135deg, #059669, #10b981); }
                .att-mark-meeting:hover { background: linear-gradient(135deg, #047857, #059669); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(5,150,105,0.3); }
                .att-refresh-btn {
                    width: 40px; height: 40px; border-radius: 10px; border: 1px solid #e2e8f0;
                    background: #fff; cursor: pointer; font-size: 0.95rem; display: flex;
                    align-items: center; justify-content: center; transition: 0.2s;
                }
                .att-refresh-btn:hover { background: #f1f5f9; transform: rotate(90deg); }

                /* ── Tabs Bar ──────────────────────────────── */
                .att-tabs-bar {
                    display: flex; justify-content: space-between; align-items: center;
                    margin-bottom: 14px; padding: 6px; background: #f8fafc;
                    border-radius: 16px; border: 1px solid #e2e8f0; flex-wrap: wrap; gap: 8px;
                }
                .att-tabs { display: flex; gap: 4px; flex: 1; }
                .att-tab {
                    flex: 1; padding: 10px 14px; border-radius: 12px; border: none;
                    background: transparent; font-size: 0.78rem; font-weight: 700;
                    cursor: pointer; transition: all 0.2s; color: #64748b;
                    display: flex; align-items: center; justify-content: center; gap: 6px;
                }
                .att-tab:hover { background: #fff; color: #1e293b; }
                .att-tab.active { background: #fff; color: #1e293b; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
                .att-tab-green.active { color: #16a34a; background: #f0fdf4; }
                .att-tab-red.active { color: #dc2626; background: #fef2f2; }
                .att-tab-yellow.active { color: #d97706; background: #fffbeb; }
                .att-tab-orange.active { color: #ea580c; background: #fff7ed; }
                .att-tab-count {
                    background: #f1f5f9; padding: 2px 8px; border-radius: 8px;
                    font-size: 0.7rem; font-weight: 800; color: #475569;
                }
                .att-tab.active .att-tab-count { background: #e2e8f0; }
                .att-type-switch { display: flex; gap: 4px; background: #fff; border-radius: 10px; padding: 3px; }
                .att-type-btn {
                    padding: 6px 14px; border-radius: 8px; border: none; background: transparent;
                    font-size: 0.75rem; font-weight: 700; cursor: pointer; color: #94a3b8; transition: 0.2s;
                }
                .att-type-btn.active { background: #1e293b; color: #fff; }

                /* ── Table Card ─────────────────────────────── */
                .att-table-card {
                    background: #fff; border-radius: 20px; border: 1px solid #e2e8f0;
                    overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.04);
                }
                .att-table-wrap { overflow-x: auto; }
                .att-table { width: 100%; border-collapse: collapse; }
                .att-table thead { position: sticky; top: 0; z-index: 2; }
                .att-th-idx {
                    width: 44px; text-align: center; padding: 14px 8px; background: #f8fafc;
                    font-weight: 800; font-size: 0.72rem; color: #94a3b8; border-bottom: 2px solid #e2e8f0; vertical-align: middle;
                }
                .att-th-name {
                    text-align: left; padding: 14px 18px; background: #f8fafc; font-weight: 800;
                    font-size: 0.78rem; color: #475569; border-bottom: 2px solid #e2e8f0; vertical-align: middle;
                }
                .att-th-text { display: block; }
                .att-th-count { display: block; font-size: 0.63rem; font-weight: 500; color: #94a3b8; margin-top: 2px; }
                .att-th-group {
                    text-align: center; padding: 10px 14px; font-size: 0.78rem; font-weight: 800;
                    border-bottom: 1px solid #e2e8f0; letter-spacing: 0.3px;
                }
                .att-th-learning { background: #eff6ff; color: #1e40af; }
                .att-th-meeting { background: #f0fdf4; color: #166534; }
                .att-th-sub {
                    text-align: center; padding: 8px 14px; font-size: 0.68rem; font-weight: 700;
                    background: #f8fafc; border-bottom: 2px solid #e2e8f0;
                    text-transform: uppercase; letter-spacing: 0.5px; color: #64748b;
                }

                /* ── Table Rows ─────────────────────────────── */
                .att-row { animation: attRowIn 0.3s ease both; transition: background 0.15s; }
                @keyframes attRowIn { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: translateX(0); } }
                .att-row:hover { background: #f8fafc; }
                .att-row td { border-bottom: 1px solid #f1f5f9; }
                .att-idx-cell { text-align: center; padding: 8px; font-size: 0.75rem; font-weight: 700; color: #cbd5e1; }
                .att-name-cell { padding: 10px 18px; }
                .att-name-wrap { display: flex; align-items: center; gap: 10px; }
                .att-avatar {
                    width: 36px; height: 36px; border-radius: 10px;
                    display: flex; align-items: center; justify-content: center;
                    color: #fff; font-weight: 800; font-size: 0.82rem; flex-shrink: 0;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.12);
                }
                .att-name-info { display: flex; flex-direction: column; flex: 1; min-width: 0; }
                .att-name-text { font-weight: 700; font-size: 0.85rem; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .att-name-sub { font-size: 0.68rem; color: #94a3b8; font-weight: 500; margin-top: 1px; }
                .att-status-badges { display: flex; gap: 3px; flex-shrink: 0; }
                .att-badge {
                    font-size: 0.58rem; font-weight: 800; padding: 2px 5px; border-radius: 4px; letter-spacing: 0.3px;
                }
                .att-badge-green { background: #dcfce7; color: #166534; }
                .att-badge-red { background: #fee2e2; color: #991b1b; }
                .att-badge-blue { background: #dbeafe; color: #1e3a8a; }
                .att-badge-orange { background: #fed7aa; color: #9a3412; }

                /* ── Toggle Buttons ────────────────────────── */
                .att-btn-cell { text-align: center; padding: 6px; }
                .att-toggle {
                    width: 42px; height: 42px; border-radius: 12px;
                    border: 2px solid #e2e8f0; background: #fff;
                    cursor: pointer; font-size: 0.95rem; font-weight: 800;
                    display: inline-flex; align-items: center; justify-content: center;
                    transition: all 0.2s ease; color: #cbd5e1;
                }
                .att-toggle:hover { transform: scale(1.08); }
                .att-toggle-present:hover { border-color: #86efac; background: #f0fdf4; color: #22c55e; }
                .att-toggle-absent:hover { border-color: #fca5a5; background: #fef2f2; color: #ef4444; }
                .att-toggle-present.active {
                    background: linear-gradient(135deg, #22c55e, #16a34a); border-color: #16a34a;
                    color: #fff; box-shadow: 0 3px 10px rgba(34,197,94,0.35); transform: scale(1.05);
                }
                .att-toggle-absent.active {
                    background: linear-gradient(135deg, #ef4444, #dc2626); border-color: #dc2626;
                    color: #fff; box-shadow: 0 3px 10px rgba(239,68,68,0.35); transform: scale(1.05);
                }
                .att-toggle-excused:hover { border-color: #fcd34d; background: #fffbeb; color: #d97706; }
                .att-toggle-excused.active {
                    background: linear-gradient(135deg, #fbbf24, #d97706); border-color: #d97706;
                    color: #fff; box-shadow: 0 3px 10px rgba(217,119,6,0.35); transform: scale(1.05);
                }

                /* ── Loading & Empty ───────────────────────── */
                .att-loading-cell { text-align: center; padding: 50px 20px; color: #94a3b8; font-weight: 600; font-size: 0.85rem; }
                .att-loading-spinner {
                    width: 32px; height: 32px; border: 3px solid #e2e8f0;
                    border-top-color: #3b82f6; border-radius: 50%;
                    animation: attSpin 0.7s linear infinite; margin: 0 auto 10px;
                }
                @keyframes attSpin { to { transform: rotate(360deg); } }
                .att-empty-cell { text-align: center; padding: 50px 20px; color: #94a3b8; font-weight: 600; font-size: 0.85rem; }
                .att-empty-icon { font-size: 2rem; margin-bottom: 8px; }

                /* ── Sidebar Drawer ─────────────────────────── */
                .att-sidebar-overlay {
                    position: fixed; inset: 0; background: rgba(0,0,0,0.4);
                    backdrop-filter: blur(4px); z-index: 9999;
                    display: flex; justify-content: flex-end;
                    animation: attOverlayIn 0.2s ease;
                }
                @keyframes attOverlayIn { from { opacity: 0; } to { opacity: 1; } }
                .att-sidebar {
                    width: 420px; max-width: 90vw; background: #fff; height: 100vh;
                    display: flex; flex-direction: column; animation: attSlideIn 0.3s ease;
                    box-shadow: -10px 0 40px rgba(0,0,0,0.12);
                }
                @keyframes attSlideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
                .att-sidebar-header {
                    display: flex; justify-content: space-between; align-items: flex-start;
                    padding: 24px 24px 16px; border-bottom: 1px solid #f1f5f9;
                }
                .att-sidebar-title { font-size: 1.15rem; font-weight: 900; color: #1e293b; margin: 0; }
                .att-sidebar-sub { font-size: 0.78rem; color: #94a3b8; font-weight: 500; margin: 3px 0 0; }
                .att-sidebar-close {
                    width: 32px; height: 32px; border-radius: 8px; border: 1px solid #e2e8f0;
                    background: #fff; cursor: pointer; font-size: 0.85rem; color: #64748b;
                    display: flex; align-items: center; justify-content: center; transition: 0.2s;
                }
                .att-sidebar-close:hover { background: #fef2f2; border-color: #fca5a5; color: #ef4444; }
                .att-sidebar-tabs {
                    display: flex; gap: 4px; padding: 12px 24px; background: #f8fafc; border-bottom: 1px solid #f1f5f9;
                }
                .att-sidebar-tab {
                    flex: 1; padding: 8px; border-radius: 8px; border: none;
                    background: transparent; font-size: 0.78rem; font-weight: 700;
                    cursor: pointer; color: #94a3b8; transition: 0.2s;
                }
                .att-sidebar-tab.active { background: #fff; color: #1e293b; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
                .att-sidebar-filter-row {
                    display: flex; gap: 6px; padding: 12px 24px; border-bottom: 1px solid #f1f5f9;
                }
                .att-sfbtn {
                    flex: 1; padding: 7px 8px; border-radius: 8px; border: 1px solid #e2e8f0;
                    background: #fff; font-size: 0.68rem; font-weight: 700;
                    cursor: pointer; color: #64748b; transition: 0.2s; text-align: center;
                }
                .att-sfbtn:hover { background: #f8fafc; }
                .att-sfbtn-green { background: #dcfce7; border-color: #86efac; color: #166534; }
                .att-sfbtn-red { background: #fee2e2; border-color: #fca5a5; color: #991b1b; }
                .att-sfbtn-yellow { background: #fef3c7; border-color: #fcd34d; color: #92400e; }
                .att-sidebar-list { flex: 1; overflow-y: auto; padding: 8px 16px; }
                .att-sidebar-empty { text-align: center; padding: 40px 20px; color: #94a3b8; font-size: 0.85rem; font-weight: 500; }
                .att-sidebar-item {
                    display: flex; align-items: center; gap: 10px;
                    padding: 10px 12px; border-radius: 12px; transition: 0.15s;
                    animation: attRowIn 0.2s ease both;
                }
                .att-sidebar-item:hover { background: #f8fafc; }
                .att-sidebar-idx { font-size: 0.72rem; font-weight: 700; color: #cbd5e1; min-width: 22px; text-align: center; }
                .att-sidebar-avatar {
                    width: 34px; height: 34px; border-radius: 10px;
                    display: flex; align-items: center; justify-content: center;
                    color: #fff; font-weight: 800; font-size: 0.78rem; flex-shrink: 0;
                }
                .att-sidebar-member-info { display: flex; flex-direction: column; flex: 1; min-width: 0; }
                .att-sidebar-name { font-weight: 700; font-size: 0.82rem; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .att-sidebar-dept { font-size: 0.68rem; color: #94a3b8; font-weight: 500; }
                .att-sidebar-actions { display: flex; gap: 5px; }
                .att-sidebar-action-btn {
                    width: 30px; height: 30px; border-radius: 8px; border: none;
                    cursor: pointer; font-size: 0.8rem; font-weight: 800;
                    display: flex; align-items: center; justify-content: center; transition: 0.2s;
                }
                .att-sa-present { background: #dcfce7; color: #16a34a; }
                .att-sa-present:hover { background: #22c55e; color: #fff; }
                .att-sa-absent { background: #fee2e2; color: #dc2626; }
                .att-sa-absent:hover { background: #ef4444; color: #fff; }

                /* ── Responsive ─────────────────────────────── */
                @media (max-width: 1024px) {
                    .att-stats-grid { grid-template-columns: 1fr 1fr; }
                    .att-stat-big { grid-column: 1 / -1; flex-direction: row; justify-content: center; padding: 16px; }
                }
                @media (max-width: 768px) {
                    .att-stats-grid { grid-template-columns: 1fr; }
                    .att-hero-content { flex-direction: column; align-items: stretch; }
                    .att-date-card { min-width: unset; }
                    .att-controls { flex-direction: column; }
                    .att-search-group { min-width: unset; flex-direction: column; }
                    .att-action-group { justify-content: flex-start; flex-wrap: wrap; }
                    .att-tabs-bar { flex-direction: column; }
                    .att-tabs { flex-wrap: wrap; }
                    .att-stat-block-items { flex-direction: column; }
                    .att-toggle { width: 36px; height: 36px; font-size: 0.82rem; }
                }
            `}</style>
        </div>
    );
};

export default Attendance;