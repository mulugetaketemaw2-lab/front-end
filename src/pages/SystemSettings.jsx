import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { greToEth } from "../utils/ethiopianDate";
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

// ─── Rich Text Editor Component ───────────────────────────────
const RichTextEditor = ({ value, onChange, placeholder }) => {
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);
  const [showTablePicker, setShowTablePicker] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);

  // Cropper states
  const [upImg, setUpImg] = useState();
  const imgRef = useRef(null);
  const [crop, setCrop] = useState({ unit: '%', width: 90, height: 90, x: 5, y: 5 });
  const [completedCrop, setCompletedCrop] = useState(null);
  const [isCropping, setIsCropping] = useState(false);
  const [insertWidth, setInsertWidth] = useState(100);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, []);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const execCmd = (command, value = null) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    handleInput();
  };

  const insertTable = () => {
    let html = '<table style="border-collapse:collapse;width:100%;margin:12px 0;border-radius:8px;overflow:hidden;">';
    for (let r = 0; r < tableRows; r++) {
      html += '<tr>';
      for (let c = 0; c < tableCols; c++) {
        const tag = r === 0 ? 'th' : 'td';
        const style = r === 0
          ? 'style="border:1px solid #cbd5e1;padding:10px 14px;background:#f1f5f9;font-weight:700;text-align:center;"'
          : 'style="border:1px solid #cbd5e1;padding:10px 14px;"';
        html += `<${tag} ${style}>${r === 0 ? 'ርዕስ' : ''}</${tag}>`;
      }
      html += '</tr>';
    }
    html += '</table><p></p>';
    execCmd('insertHTML', html);
    setShowTablePicker(false);
  };

  const onSelectFile = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast.error('ምስሉ ከ5MB ያነሰ መሆን አለበት');
        return;
      }
      const reader = new FileReader();
      reader.addEventListener('load', () => setUpImg(reader.result));
      reader.readAsDataURL(file);
      setIsCropping(true);
      e.target.value = '';
    }
  };

  const onLoad = useCallback((img) => {
    imgRef.current = img;
  }, []);

  const insertCroppedImage = () => {
    if (!imgRef.current) return;
    const image = imgRef.current;
    
    // If no crop was interacted with or width is 0, just insert the original
    if (!completedCrop || !completedCrop.width || !completedCrop.height) {
        execCmd('insertHTML', `<img src="${upImg}" alt="image" style="width:${insertWidth}%;max-width:100%;border-radius:12px;margin:10px 0;box-shadow:0 2px 8px rgba(0,0,0,0.1);" />`);
        setIsCropping(false);
        return;
    }

    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    canvas.width = completedCrop.width;
    canvas.height = completedCrop.height;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width,
      completedCrop.height
    );

    const base64Image = canvas.toDataURL('image/png');
    execCmd('insertHTML', `<img src="${base64Image}" alt="cropped-image" style="width:${insertWidth}%;max-width:100%;border-radius:12px;margin:10px 0;box-shadow:0 2px 8px rgba(0,0,0,0.1);" />`);
    setIsCropping(false);
    setUpImg(null);
    setCompletedCrop(null);
  };

  const insertDivider = () => {
    execCmd('insertHTML', '<hr style="border:none;border-top:2px solid #e2e8f0;margin:16px 0;" /><p></p>');
  };

  const ToolBtn = ({ onClick, title, children, active }) => (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      style={{
        width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '700',
        background: active ? '#e0e7ff' : 'transparent', color: active ? '#4338ca' : '#475569',
        transition: 'all 0.15s'
      }}
    >
      {children}
    </button>
  );

  const Separator = () => <div style={{ width: '1px', height: '24px', background: '#e2e8f0', margin: '0 4px' }} />;

  return (
    <div style={{ border: '2px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', background: '#fff' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '2px', padding: '8px 12px',
        background: '#f8fafc', borderBottom: '2px solid #e2e8f0', alignItems: 'center'
      }}>
        {/* Text Style */}
        <ToolBtn onClick={() => execCmd('bold')} title="Bold (ወፍራም)">𝐁</ToolBtn>
        <ToolBtn onClick={() => execCmd('italic')} title="Italic (ሰያፍ)">𝐼</ToolBtn>
        <ToolBtn onClick={() => execCmd('underline')} title="Underline (ከስር መስመር)"><u>U</u></ToolBtn>
        <ToolBtn onClick={() => execCmd('strikeThrough')} title="Strikethrough (ቁራጭ)"><s>S</s></ToolBtn>

        <Separator />

        {/* Headings */}
        <ToolBtn onClick={() => execCmd('formatBlock', 'h2')} title="ትልቅ ርእስ (Heading)">H2</ToolBtn>
        <ToolBtn onClick={() => execCmd('formatBlock', 'h3')} title="መካከለኛ ርእስ">H3</ToolBtn>
        <ToolBtn onClick={() => execCmd('formatBlock', 'h4')} title="ትንሽ ርእስ">H4</ToolBtn>
        <ToolBtn onClick={() => execCmd('formatBlock', 'p')} title="ተራ ጽሑፍ (Normal)">¶</ToolBtn>

        <Separator />

        {/* Colors */}
        <div style={{ position: 'relative', display: 'inline-flex' }}>
          <ToolBtn onClick={() => {}} title="የጽሑፍ ቀለም (Text Color)">
            <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
              🎨
              <input type="color" defaultValue="#ef4444" onChange={(e) => execCmd('foreColor', e.target.value)} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
            </label>
          </ToolBtn>
        </div>
        <div style={{ position: 'relative', display: 'inline-flex' }}>
          <ToolBtn onClick={() => {}} title="የጀርባ ቀለም (Highlight)">
            <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
              🖌️
              <input type="color" defaultValue="#fef08a" onChange={(e) => execCmd('hiliteColor', e.target.value)} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
            </label>
          </ToolBtn>
        </div>

        <Separator />

        {/* Lists */}
        <ToolBtn onClick={() => execCmd('insertUnorderedList')} title="ነጥብ ዝርዝር (Bullet List)">•</ToolBtn>
        <ToolBtn onClick={() => execCmd('insertOrderedList')} title="ቁጥር ዝርዝር (Numbered List)">1.</ToolBtn>

        <Separator />

        {/* Alignment */}
        <ToolBtn onClick={() => execCmd('justifyLeft')} title="ግራ (Left)">⫷</ToolBtn>
        <ToolBtn onClick={() => execCmd('justifyCenter')} title="መሃል (Center)">⫿</ToolBtn>
        <ToolBtn onClick={() => execCmd('justifyRight')} title="ቀኝ (Right)">⫸</ToolBtn>

        <Separator />

        {/* Table */}
        <div style={{ position: 'relative' }}>
          <ToolBtn onClick={() => setShowTablePicker(!showTablePicker)} title="ሠንጠረዥ (Table)">⊞</ToolBtn>
          {showTablePicker && (
            <div style={{
              position: 'absolute', top: '38px', left: 0, background: '#fff', borderRadius: '14px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.15)', padding: '16px', zIndex: 100, minWidth: '200px',
              border: '1px solid #e2e8f0'
            }}>
              <p style={{ margin: '0 0 10px', fontWeight: '700', fontSize: '13px', color: '#334155' }}>📊 ሠንጠረዥ አስገባ</p>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>ረድፍ (Rows)</label>
                  <input type="number" min="1" max="20" value={tableRows} onChange={e => setTableRows(+e.target.value)} style={{ width: '60px', padding: '6px', borderRadius: '8px', border: '1.5px solid #cbd5e1', textAlign: 'center' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>ዓምድ (Cols)</label>
                  <input type="number" min="1" max="10" value={tableCols} onChange={e => setTableCols(+e.target.value)} style={{ width: '60px', padding: '6px', borderRadius: '8px', border: '1.5px solid #cbd5e1', textAlign: 'center' }} />
                </div>
              </div>
              <button type="button" onClick={insertTable} style={{ width: '100%', padding: '8px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '13px' }}>
                ✅ አስገባ (Insert)
              </button>
            </div>
          )}
        </div>

        {/* Image */}
        <ToolBtn onClick={() => fileInputRef.current?.click()} title="ምስል (Image)">🖼️</ToolBtn>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={onSelectFile} style={{ display: 'none' }} />

        {/* Divider */}
        <ToolBtn onClick={insertDivider} title="መስመር (Divider)">━</ToolBtn>

        {/* Undo/Redo */}
        <Separator />
        <ToolBtn onClick={() => execCmd('undo')} title="ተመለስ (Undo)">↩</ToolBtn>
        <ToolBtn onClick={() => execCmd('redo')} title="ድገም (Redo)">↪</ToolBtn>
      </div>

      {/* Editor Area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        data-placeholder={placeholder || "እዚህ ይጻፉ..."}
        style={{
          minHeight: '250px', padding: '20px', fontSize: '1rem', lineHeight: '1.8',
          color: '#1e293b', outline: 'none', fontFamily: 'inherit',
          overflowY: 'auto', maxHeight: '800px',
          resize: 'vertical', overflow: 'auto'
        }}
      />

      {/* Cropper Modal */}
      {isCropping && upImg && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', padding: '25px', borderRadius: '20px', width: '90%', maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#1e293b' }}>✂️ ምስሉን ያስተካክሉ (Crop Image)</h3>
              <button 
                onClick={() => setIsCropping(false)} 
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', color: '#64748b', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>
            
            <div style={{ flex: 1, overflow: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f8fafc', borderRadius: '12px', padding: '20px' }}>
              <ReactCrop crop={crop} onChange={c => setCrop(c)} onComplete={c => setCompletedCrop(c)}>
                <img src={upImg} onLoad={e => onLoad(e.currentTarget)} alt="Upload" style={{ maxHeight: '50vh', maxWidth: '100%', objectFit: 'contain' }} />
              </ReactCrop>
            </div>

            <div style={{ marginTop: '20px', padding: '15px', background: '#f1f5f9', borderRadius: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <strong style={{ fontSize: '0.9rem', color: '#334155' }}>🔎 የምስሉ መጠን ማሳነሻ / ማጥበቢያ (Display Size)</strong>
                <span style={{ fontWeight: '900', color: '#3b82f6', fontSize: '0.9rem' }}>{insertWidth}%</span>
              </div>
              <input 
                type="range" 
                min="10" max="100" 
                value={insertWidth} 
                onChange={e => setInsertWidth(Number(e.target.value))} 
                style={{ width: '100%', cursor: 'pointer', accentColor: '#3b82f6' }} 
              />
            </div>
            
            <div style={{ display: 'flex', gap: '15px', marginTop: '25px', justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                onClick={() => setIsCropping(false)} 
                style={{ background: '#f1f5f9', color: '#475569', border: 'none', padding: '12px 24px', borderRadius: '12px', fontWeight: '800', cursor: 'pointer' }}
              >
                ሰርዝ (Cancel)
              </button>
              <button 
                type="button" 
                onClick={insertCroppedImage} 
                className="btn btn-primary" 
                style={{ padding: '12px 30px', borderRadius: '12px', fontWeight: '800', border: 'none', background: '#3b82f6', color: '#fff', cursor: 'pointer' }}
              >
                ✅ አስገባ (Crop & Insert)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SystemSettings = ({ user }) => {
  const [settings, setSettings] = useState({ currentTerm: "", allowMemberMessaging: false, allowExecutiveMessaging: false });
  const [deptSettings, setDeptSettings] = useState({ allowDepartmentMessaging: false });
  const [newTerm, setNewTerm] = useState("");
  const [registrationNotice, setRegistrationNotice] = useState("");
  const [noticeEditDraft, setNoticeEditDraft] = useState("");
  const [isEditingNotice, setIsEditingNotice] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingNotice, setSavingNotice] = useState(false);

  const isAdmin = ['super_admin', 'admin'].includes(user?.role);
  const isLeadership = ['sebsabi', 'meketel_sebsabi', 'tsehafy'].includes(user?.role);
  const isDeptHead = !isAdmin && !isLeadership;

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      if (isAdmin || isLeadership) await fetchSettings();
      if (isDeptHead || isLeadership) await fetchUserSettings();
      setLoading(false);
    };
    init();
  }, []);

  const fetchUserSettings = async () => {
    try {
      const { data } = await axios.get('/auth/profile');
      setDeptSettings({ allowDepartmentMessaging: data.allowDepartmentMessaging });
    } catch (err) {
      console.error("Error fetching user settings:", err);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await axios.get("/settings");
      setSettings(response.data);
      setNewTerm(response.data.currentTerm);
      setRegistrationNotice(response.data.registrationNotice || "");
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("ቅንብሮችን ማምጣት አልተሳካም (Failed to fetch settings)");
    }
  };

  const handleTermChange = (e) => {
    setNewTerm(e.target.value);
  };

  const handleUpdateTerm = async (e) => {
    e.preventDefault();
    try {
      await axios.post("/settings/term", { term: newTerm });
      toast.success("ወቅታዊ አመት በተሳካ ሁኔታ ተቀይሯል (Term updated successfully)");
      fetchSettings();
    } catch (error) {
      console.error("Error updating term:", error);
      toast.error("አመቱን መቀየር አልተሳካም (Update failed)");
    }
  };

  const handleTransition = async () => {
    if (!window.confirm("እርግጠኛ ነዎት? ይህ ለውጥ ሁሉንም አዳዲስ ምዝገባዎች ወደ አዲሱ አመት ይወስዳል። \n\nAre you sure? This will transition all activities to the new term.")) return;
    
    try {
      await axios.post("/settings/transition", { newTerm });
      toast.success("የአመት ሽግግር በተሳካ ሁኔታ ተጠናቋል (Yearly transition completed)");
      fetchSettings();
    } catch (error) {
      console.error("Transition error:", error);
      toast.error("ሽግግሩ አልተሳካም (Transition failed)");
    }
  };

  const handleUpdateNotice = async () => {
    setSavingNotice(true);
    try {
      await axios.patch("/settings/registration-notice", { notice: noticeEditDraft });
      setRegistrationNotice(noticeEditDraft);
      setIsEditingNotice(false);
      toast.success("የምዝገባ ቅድመ ማስታወቂያ ተዘምኗል (Registration notice updated)");
      fetchSettings();
    } catch (error) {
      console.error("Error updating notice:", error);
      toast.error("ማስታወቂያውን መቀየር አልተሳካም (Failed to update notice)");
    } finally {
      setSavingNotice(false);
    }
  };

  const handleDeleteNotice = async () => {
    if (!window.confirm("እርግጠኛ ነዎት? ይህ ማስታወቂያውን ሙሉ በሙሉ ያጠፋዋል። (Are you sure you want to delete this notice?)")) return;
    
    setSavingNotice(true);
    try {
      await axios.patch("/settings/registration-notice", { notice: "" });
      toast.success("ማስታወቂያው በተሳካ ሁኔታ ተሰርዟል (Notice deleted successfully)");
      setRegistrationNotice("");
      fetchSettings();
    } catch (error) {
      console.error("Error deleting notice:", error);
      toast.error("ማስታወቂያውን መሰረዝ አልተሳካም (Failed to delete notice)");
    } finally {
      setSavingNotice(false);
    }
  };

  const handleToggleOfficeMessaging = async (target) => {
    try {
      const res = await axios.patch('/messages/toggle-office-messaging', { target });
      setSettings(prev => ({ 
        ...prev, 
        allowMemberMessaging: res.data.allowMemberMessaging, 
        allowExecutiveMessaging: res.data.allowExecutiveMessaging 
      }));
      toast.success(res.data.message);
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleDownloadBackup = async () => {
    try {
      toast.loading("ዳታውን በማዘጋጀት ላይ... (Preparing backup...)", { id: 'backup' });
      const response = await axios.get("/settings/backup", { responseType: 'blob' });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const fileName = `gbi_backup_${new Date().toISOString().split('T')[0]}.json`;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success("ዳታው በስኬት ተቀምጧል (Backup downloaded successfully)", { id: 'backup' });
    } catch (error) {
      console.error("Backup error:", error);
      toast.error("ዳታውን ማስቀመጥ አልተሳካም (Backup failed)", { id: 'backup' });
    }
  };

  const handleRestoreBackup = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!window.confirm("⚠️ ማስጠንቀቂያ፡ ይህ ሁሉንም ነባር ዳታ ያጠፋል! እርግጠኛ ነዎት?\n\nWARNING: This will overwrite ALL existing data! Are you sure?")) {
      e.target.value = '';
      return;
    }

    try {
      toast.loading("ዳታውን በመመለስ ላይ... (Restoring data...)", { id: 'restore' });
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const backupData = JSON.parse(event.target.result);
          await axios.post("/settings/restore", { data: backupData });
          toast.success("ዳታው በስኬት ተመልሷል (System restored successfully)", { id: 'restore' });
          setTimeout(() => window.location.reload(), 2000);
        } catch (err) {
          toast.error("የፋይሉ ቅርጸት የተሳሳተ ነው (Invalid file format)", { id: 'restore' });
        }
      };
      reader.readAsText(file);
    } catch (error) {
      console.error("Restore error:", error);
      toast.error("ዳታውን መመለስ አልተሳካም (Restore failed)", { id: 'restore' });
    } finally {
      e.target.value = '';
    }
  };

  if (loading) return (
    <div className="loading-state" style={{ marginTop: '50px' }}>
      <div className="spinner" style={{ fontSize: '2rem', marginBottom: '10px' }}>⏳</div>
      <p>Loading Settings...</p>
    </div>
  );

  return (
    <div className="settings-page" style={{ animation: 'fadeIn 0.3s ease' }}>
      <div className="role-banner banner-audit" data-symbol="⚙️" style={{ marginBottom: '20px' }}>
        <div className="banner-icon">🔧</div>
        <div className="banner-text">
          <h2 className="banner-title">
            {isAdmin ? 'የስርዓት ቅንብር (System Settings)' : isLeadership ? 'የጽህፈት ቤት ቅንብር (Office Settings)' : 'የክፍል ቅንብር (Department Settings)'}
          </h2>
          <p className="banner-subtitle">
            {isAdmin ? 'Manage global configuration and term transitions' : 'Manage communication permissions'}
          </p>
        </div>
      </div>
      
      {isAdmin && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">ወቅታዊ አመት ማስተዳደሪያ (Term Management)</h3>
          </div>
          <div style={{ marginBottom: '15px' }}>
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>የአሁኑ አመት (Current Term): <strong style={{ color: 'var(--primary)', fontSize: '1.1rem', marginLeft: '5px' }}>{settings.currentTerm || 'Not set'}</strong></p>
          </div>
          
          <form onSubmit={handleUpdateTerm} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, maxWidth: '300px' }}>
              <input 
                type="text" 
                className="form-control"
                value={newTerm} 
                onChange={handleTermChange}
                placeholder={`ምሳሌ: ${greToEth(new Date()).year} E.C`}
                required
              />
              <small style={{ color: 'var(--text-light)', marginTop: '4px', display: 'block' }}>Enter the new academic year formatting</small>
            </div>
            <button type="submit" className="btn btn-primary">
              <span style={{ marginRight: '6px' }}>💾</span> አዘምን (Update)
            </button>
          </form>
        </div>
      )}

      {(isAdmin || isLeadership) && (
        <div className="card" style={{ borderLeft: '5px solid #4f46e5', padding: '25px', borderRadius: '24px' }}>
          <div className="card-header" style={{ borderBottom: 'none', padding: '0 0 20px' }}>
            <h3 className="card-title" style={{ fontSize: '1.25rem', fontWeight: '900', display: 'flex', alignItems: 'center' }}>
              <span style={{ marginRight: '10px' }}>⚙️</span> የፈቃድ መስጫ (Control Panel)
            </h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Member Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: settings.allowMemberMessaging ? '#f0fdf4' : '#fff1f2', padding: '18px', borderRadius: '20px', border: '1px solid ' + (settings.allowMemberMessaging ? '#dcfce7' : '#fee2e2'), transition: 'all 0.3s' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#1e293b' }}>አባላት ወደ ጽህፈት ቤት</h4>
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>Members to Office</p>
              </div>
              <button 
                onClick={() => handleToggleOfficeMessaging('member')}
                style={{
                  background: settings.allowMemberMessaging ? '#166534' : '#991b1b',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '12px', padding: '10px 20px', fontWeight: '900', cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  display: 'flex', alignItems: 'center', gap: '8px'
                }}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: settings.allowMemberMessaging ? '#4ade80' : '#fca5a5' }}></span>
                {settings.allowMemberMessaging ? 'ክፍት' : 'ዝግ'}
              </button>
            </div>

            {/* Executive Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: settings.allowExecutiveMessaging ? '#f0fdf4' : '#fff1f2', padding: '18px', borderRadius: '20px', border: '1px solid ' + (settings.allowExecutiveMessaging ? '#dcfce7' : '#fee2e2'), transition: 'all 0.3s' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#1e293b' }}>ስራ አስፈጻሚ ወደ ጽህፈት ቤት</h4>
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>Execs to Office</p>
              </div>
              <button 
                onClick={() => handleToggleOfficeMessaging('executive')}
                style={{
                  background: settings.allowExecutiveMessaging ? '#166534' : '#991b1b',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '12px', padding: '10px 20px', fontWeight: '900', cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  display: 'flex', alignItems: 'center', gap: '8px'
                }}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: settings.allowExecutiveMessaging ? '#4ade80' : '#fca5a5' }}></span>
                {settings.allowExecutiveMessaging ? 'ክፍት' : 'ዝግ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {(isAdmin || isLeadership) && (
        <div className="card" style={{ borderLeft: '5px solid #f59e0b', padding: '25px', borderRadius: '24px', marginTop: '20px' }}>
          <div className="card-header" style={{ borderBottom: 'none', padding: '0 0 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="card-title" style={{ fontSize: '1.25rem', fontWeight: '900', display: 'flex', alignItems: 'center', margin: 0 }}>
              <span style={{ marginRight: '10px' }}>📝</span> የምዝገባ ቅድመ ማስታወቂያ (Registration Notice)
            </h3>
            {!isEditingNotice && (
              <button
                onClick={() => { setNoticeEditDraft(registrationNotice); setIsEditingNotice(true); }}
                className="btn btn-primary"
                style={{ borderRadius: '12px', padding: '10px 24px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                ✏️ አስተካክል (Edit)
              </button>
            )}
          </div>

          {isEditingNotice ? (
            /* ─── Edit Mode ─── */
            <div style={{ animation: 'fadeIn 0.3s ease' }}>
              <p style={{ margin: '0 0 15px', color: '#64748b', fontSize: '0.9rem' }}>
                አባላቶች register ከማድረጋቸው በፊት እንዲያውቁት የሚፈለገውን ዝርዝር መረጃ እዚህ ያስገቡ። ምስሎችን፣ ሠንጠረዥ፣ bold/italic ማስገባት ይቻላል።
              </p>
              <RichTextEditor
                value={noticeEditDraft}
                onChange={setNoticeEditDraft}
                placeholder="ዝርዝር መረጃውን እዚህ ይጻፉ..."
              />
              <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '12px', marginTop: '20px' }}>
                <button
                  onClick={handleUpdateNotice}
                  disabled={savingNotice}
                  className="btn btn-primary btn-lg"
                  style={{ borderRadius: '14px', padding: '12px 35px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #16a34a, #15803d)', border: 'none', boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)' }}
                >
                  {savingNotice ? '⏳ በማስቀመጥ ላይ...' : '💾 አስቀምጥ (Save)'}
                </button>
                <button
                  onClick={() => { setIsEditingNotice(false); setNoticeEditDraft(''); }}
                  disabled={savingNotice}
                  className="btn btn-ghost"
                  style={{ borderRadius: '14px', padding: '12px 25px', fontWeight: '800', color: '#64748b', border: '2px solid #e2e8f0' }}
                >
                  ✕ ሰርዝ (Cancel)
                </button>
                <button
                  onClick={handleDeleteNotice}
                  disabled={savingNotice || !registrationNotice}
                  className="btn btn-danger"
                  style={{ borderRadius: '14px', padding: '12px 20px', fontWeight: '800', marginLeft: 'auto' }}
                >
                  🗑️ ሁሉንም ሰርዝ (Delete)
                </button>
              </div>
            </div>
          ) : (
            /* ─── View Mode ─── */
            <div>
              {registrationNotice ? (
                <div
                  style={{
                    padding: '25px', background: '#fffbeb', borderRadius: '16px',
                    border: '1px solid #fde68a', lineHeight: '1.8', fontSize: '1rem',
                    color: '#1e293b', marginTop: '10px'
                  }}
                  dangerouslySetInnerHTML={{ __html: registrationNotice }}
                />
              ) : (
                <div style={{
                  padding: '30px', textAlign: 'center', color: '#94a3b8',
                  background: '#f8fafc', borderRadius: '16px', border: '2px dashed #e2e8f0',
                  marginTop: '10px'
                }}>
                  <span style={{ fontSize: '2rem', display: 'block', marginBottom: '10px' }}>📭</span>
                  <p style={{ margin: 0, fontWeight: '600' }}>ምንም ማስታወቂያ አልተቀመጠም</p>
                  <p style={{ margin: '5px 0 0', fontSize: '0.85rem' }}>"✏️ አስተካክል" ቁልፍ ተጭነው ማስታወቂያ ያስገቡ</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Department Specific Messaging Toggle for Executives */}
      {isDeptHead && (
        <div className="card" style={{ borderLeft: '5px solid #6366f1', padding: '25px', borderRadius: '24px' }}>
          <div className="card-header" style={{ borderBottom: 'none', padding: '0 0 20px' }}>
            <h3 className="card-title" style={{ fontSize: '1.25rem', fontWeight: '900', display: 'flex', alignItems: 'center' }}>
              <span style={{ marginRight: '10px' }}>📨</span> የክፍል መልዕክት ቅንብር (Department Messaging)
            </h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: deptSettings.allowDepartmentMessaging ? '#f0fdf4' : '#fff1f2', padding: '18px', borderRadius: '20px', border: '1px solid ' + (deptSettings.allowDepartmentMessaging ? '#dcfce7' : '#fee2e2'), transition: 'all 0.3s' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#1e293b' }}>አባላት ለክፍሉ (ለእርስዎ) መላክ</h4>
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>Allow Dept Messaging</p>
              </div>
              <button 
                onClick={async () => {
                  try {
                    const res = await axios.patch('/messages/toggle-dept');
                    setDeptSettings({ allowDepartmentMessaging: res.data.allowDeptMessaging });
                    toast.success(res.data.message);
                  } catch (err) {
                    toast.error('Failed to toggle messaging');
                  }
                }}
                style={{
                  background: deptSettings.allowDepartmentMessaging ? '#166534' : '#991b1b',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '12px', padding: '10px 20px', fontWeight: '900', cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  display: 'flex', alignItems: 'center', gap: '8px'
                }}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: deptSettings.allowDepartmentMessaging ? '#4ade80' : '#fca5a5' }}></span>
                {deptSettings.allowDepartmentMessaging ? 'ክፍት' : 'ዝግ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isAdmin && (
        <>
          <div className="card" style={{ borderLeft: '4px solid var(--danger)' }}>
            <div className="card-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
              <h3 className="card-title" style={{ color: 'var(--danger)' }}>⚠️ የአመት ሽግግር (Yearly Transition)</h3>
            </div>
            <div style={{ padding: '0 1.5rem 1.5rem' }}>
              <p style={{ color: 'var(--text-muted)', marginBottom: '15px' }}>ይህ ተግባር አዲሱን አመት ይጀምራል። (Executing this action will transition the system to the new term. Do this carefully!)</p>
              <button onClick={handleTransition} className="btn btn-danger btn-lg">
                <span style={{ marginRight: '8px' }}>🚀</span> አዲስ አመት ጀምር (Execute Transition)
              </button>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="card-title">የመረጃ ጥበቃ (Data Management)</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', padding: '10px' }}>
              <div className="backup-section">
                <h4 style={{ marginBottom: '10px' }}>የመረጃ ጥበቃ (Backup)</h4>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '15px' }}>ሁሉንም መረጃዎች ወደ ኮምፒውተርዎ ለማውረድ (Download all system data for safety).</p>
                <button onClick={handleDownloadBackup} className="btn btn-secondary">
                  <span style={{ marginRight: '8px' }}>📥</span> ኮፒ አውርድ (Download Backup)
                </button>
              </div>
              
              <div className="restore-section" style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '20px' }}>
                <h4 style={{ marginBottom: '10px' }}>መረጃ መመለስ (Restore)</h4>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '15px' }}>ከዚህ በፊት ያስቀመጡትን መረጃ ለመመለስ (Upload a previous backup to restore system state).</p>
                <div className="file-input-wrapper">
                  <input 
                    type="file" 
                    accept=".json" 
                    onChange={handleRestoreBackup}
                    id="restore-upload"
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="restore-upload" className="btn btn-outline">
                    <span style={{ marginRight: '8px' }}>📤</span> ፋይል ምረጥ (Select Backup File)
                  </label>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SystemSettings;
