import React, { useState, useEffect } from 'react'
import { LayoutDashboard, Users, Activity, Settings, LogOut, Search, Bell, Shield, CheckCircle, XCircle, Key, Mail, RefreshCw, FileText, Pencil, Trash2, Plus, Baby, Dumbbell } from 'lucide-react'

const CATALOGO_EJERCICIOS_WEB = {
  'abduccion-ranita':       { titulo: 'Ejercicio de la Ranita',     emoji: '🐸', color: '#00E5CC' },
  'estiramiento-aductores': { titulo: 'Masaje de Muslos',           emoji: '💛', color: '#FFD700' },
  'panal-seguro':           { titulo: 'Cambio de Pañal Seguro',     emoji: '🌿', color: '#FF7E5F' },
  'porteo-ergonomico':      { titulo: 'Cargado en Brazos (Porteo)', emoji: '🤱', color: '#A855F7' },
}
import { supabase } from './lib/supabase'

function App() {
  const [session, setSession] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [isLoading, setIsLoading] = useState(true)

  const [patients, setPatients] = useState([])
  const [selectedPatient, setSelectedPatient] = useState('')

  const [doctors, setDoctors] = useState([])
  const [selectedDoctor, setSelectedDoctor] = useState('')
  const [adminPatients, setAdminPatients] = useState([])
  const [selectedAdminPatient, setSelectedAdminPatient] = useState('')
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [globalStats, setGlobalStats] = useState({
    totalDoctors: 0,
    totalPatients: 0,
    totalAnalisis: 0
  })

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [refreshKey, setRefreshKey] = useState(Date.now())

  // --- Estado: Gestión de Pacientes (Admin CRUD) ---
  const [allPatients, setAllPatients] = useState([])
  const [showPatientModal, setShowPatientModal] = useState(false)
  const [editingPatient, setEditingPatient] = useState(null)
  const [patientForm, setPatientForm] = useState({
    nombre_completo: '', fecha_nacimiento: '', sexo: 'M', medico_id: '',
    nombre_tutor: '', telefono_contacto: '', edad_gestacional: '',
    presentacion_nalgas: false, antecedente_familiar: false, codigo_paciente: ''
  })
  const [patientActionLoading, setPatientActionLoading] = useState(false)

  // --- Estado: Prescripciones de Rehabilitación ---
  const [prescripciones, setPrescripciones] = useState([])
  const [prescripcionesLoading, setPrescripcionesLoading] = useState(false)
  const [prescripcionesFilterMedico, setPrescripcionesFilterMedico] = useState('todos')

  const handleSyncData = async () => {
    setIsSyncing(true)
    try {
      const backendHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
      const response = await fetch(`http://${backendHost}:8005/clinical/sync`, {
        method: 'POST'
      })
      if (!response.ok) throw new Error('Error al sincronizar con el servidor')
      
      if (userProfile?.rol === 'admin') {
        await fetchAdminData()
      } else if (userProfile?.rol === 'medico') {
        await fetchMedicoPatients()
      }
      
      setRefreshKey(Date.now())
      alert('¡Sincronización completada con éxito!')
    } catch (err) {
      console.error(err)
      alert('No se pudo sincronizar la analítica. Asegúrese de que el backend esté activo.')
    } finally {
      setIsSyncing(false)
    }
  }

  // ─── Patient management handlers ─────────────────────────────────────────
  const fetchAllPatients = async () => {
    try {
      const backendHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
      const res = await fetch(`http://${backendHost}:8005/admin/all-patients`)
      if (!res.ok) throw new Error('Error fetching patients')
      const data = await res.json()
      setAllPatients(data || [])
    } catch (err) {
      console.error('Error fetching all patients:', err)
    }
  }

  const handleOpenCreatePatient = () => {
    setEditingPatient(null)
    const newCode = `P-${Math.floor(1000 + Math.random() * 9000)}`
    setPatientForm({
      nombre_completo: '', fecha_nacimiento: '', sexo: 'M', medico_id: doctors[0]?.id || '',
      nombre_tutor: '', telefono_contacto: '', edad_gestacional: '',
      presentacion_nalgas: false, antecedente_familiar: false, codigo_paciente: newCode
    })
    setShowPatientModal(true)
  }

  const handleOpenEditPatient = (patient) => {
    setEditingPatient(patient)
    setPatientForm({
      nombre_completo: patient.nombre_completo || '',
      fecha_nacimiento: patient.fecha_nacimiento || '',
      sexo: patient.sexo || 'M',
      medico_id: patient.medico_id || (doctors[0]?.id || ''),
      nombre_tutor: patient.nombre_tutor || '',
      telefono_contacto: patient.telefono_contacto || '',
      edad_gestacional: patient.edad_gestacional !== null && patient.edad_gestacional !== undefined ? String(patient.edad_gestacional) : '',
      presentacion_nalgas: patient.presentacion_nalgas || false,
      antecedente_familiar: patient.antecedente_familiar || false,
      codigo_paciente: patient.codigo_paciente || ''
    })
    setShowPatientModal(true)
  }

  const handleClosePatientModal = () => {
    setShowPatientModal(false)
    setEditingPatient(null)
  }

  const handleSavePatient = async (e) => {
    e.preventDefault()
    setPatientActionLoading(true)
    try {
      const backendHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
      const url = editingPatient
        ? `http://${backendHost}:8005/admin/patients/${editingPatient.id}`
        : `http://${backendHost}:8005/admin/patients`
      const method = editingPatient ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patientForm)
      })
      if (!res.ok) throw new Error('Error saving patient')
      handleClosePatientModal()
      await fetchAllPatients()
      await fetchAdminData()
    } catch (err) {
      console.error('Error saving patient:', err)
      alert('No se pudo guardar el paciente. Verifique los datos e intente de nuevo.')
    } finally {
      setPatientActionLoading(false)
    }
  }

  const handleDeletePatient = async (patient) => {
    if (!confirm(`¿Eliminar a "${patient.nombre_completo}" y todos sus análisis? Esta acción es irreversible.`)) return
    try {
      const backendHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
      const res = await fetch(`http://${backendHost}:8005/admin/patients/${patient.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error deleting patient')
      setAllPatients(prev => prev.filter(p => p.id !== patient.id))
      await fetchAdminData()
    } catch (err) {
      console.error('Error deleting patient:', err)
      alert('No se pudo eliminar el paciente.')
    }
  }

  const fetchPrescripciones = async () => {
    setPrescripcionesLoading(true)
    try {
      const backendHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
      const res = await fetch(`http://${backendHost}:8005/admin/prescriptions`)
      if (!res.ok) throw new Error('Error obteniendo prescripciones')
      const data = await res.json()
      setPrescripciones(data || [])
    } catch (err) {
      console.error('Error fetching prescripciones:', err)
    } finally {
      setPrescripcionesLoading(false)
    }
  }

  const handleDeletePrescripcion = async (id) => {
    if (!confirm('¿Eliminar esta prescripción? El padre ya no verá este ejercicio asignado.')) return
    try {
      const backendHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
      const res = await fetch(`http://${backendHost}:8005/admin/prescriptions/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setPrescripciones(prev => prev.filter(p => p.id !== id))
    } catch {
      alert('No se pudo eliminar la prescripción.')
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) {
        fetchUserProfile(session.user.id)
      } else {
        setIsLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        fetchUserProfile(session.user.id)
      } else {
        setUserProfile(null)
        setIsLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session && userProfile) {
      if (userProfile.rol === 'admin') {
        fetchAdminData()
        if (activeTab === 'manage_patients') fetchAllPatients()
        if (activeTab === 'prescripciones') fetchPrescripciones()
      } else if (userProfile.rol === 'medico') {
        fetchMedicoPatients()
      }
    }
  }, [activeTab])

  const fetchUserProfile = async (userId) => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      setUserProfile(data)

      if (data.rol === 'admin') {
        await fetchAdminData()
      } else if (data.rol === 'medico') {
        await fetchMedicoPatients()
      }
    } catch (err) {
      console.error('Error fetching user profile:', err)
      setAuthError('Error al recuperar el perfil del usuario.')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchMedicoPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('pacientes')
        .select('id, nombre_completo')
        .order('nombre_completo')
      
      if (error) throw error
      setPatients(data || [])
      if (data && data.length > 0) {
        setSelectedPatient(data[0].id)
      }
    } catch (err) {
      console.error('Error fetching patients:', err)
    }
  }

  const fetchAdminData = async () => {
    try {
      const backendHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
      
      // 1. Obtener la lista de médicos de la API del backend (bypass RLS)
      const docResponse = await fetch(`http://${backendHost}:8005/admin/doctors`)
      if (!docResponse.ok) throw new Error('Error al obtener la lista de médicos')
      const doctorsData = await docResponse.json()
      
      setDoctors(doctorsData || [])
      
      // Determinar cuál médico seleccionar sin resetear la selección actual si es válida
      let docToSelect = ''
      if (doctorsData && doctorsData.length > 0) {
        const isCurrentDocValid = doctorsData.some(d => d.id === selectedDoctor)
        docToSelect = isCurrentDocValid ? selectedDoctor : doctorsData[0].id
        setSelectedDoctor(docToSelect)
        await fetchPatientsByDoctor(docToSelect)
      } else {
        setSelectedDoctor('')
        setAdminPatients([])
        setSelectedAdminPatient('')
      }

      // 2. Obtener las estadísticas globales de la API del backend (bypass RLS)
      const statsResponse = await fetch(`http://${backendHost}:8005/admin/stats`)
      if (!statsResponse.ok) throw new Error('Error al obtener las estadísticas')
      const statsData = await statsResponse.json()

      setGlobalStats(statsData)
    } catch (err) {
      console.error('Error fetching admin data:', err)
    }
  }

  const fetchPatientsByDoctor = async (doctorId) => {
    if (!doctorId) {
      setAdminPatients([])
      setSelectedAdminPatient('')
      return
    }
    try {
      const backendHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
      const response = await fetch(`http://${backendHost}:8005/admin/patients/${doctorId}`)
      if (!response.ok) throw new Error('Error al obtener los pacientes del médico')
      const data = await response.json()

      setAdminPatients(data || [])
      if (data && data.length > 0) {
        // Preservar la selección del paciente actual si es válido en la nueva lista
        const isCurrentPatientValid = data.some(p => p.id === selectedAdminPatient)
        setSelectedAdminPatient(isCurrentPatientValid ? selectedAdminPatient : data[0].id)
      } else {
        setSelectedAdminPatient('')
      }
    } catch (err) {
      console.error('Error fetching doctor patients:', err)
    }
  }

  const handleDoctorChange = async (doctorId) => {
    setSelectedDoctor(doctorId)
    await fetchPatientsByDoctor(doctorId)
  }

  const handleMonitorDoctor = async (doctorId) => {
    setSelectedDoctor(doctorId)
    await fetchPatientsByDoctor(doctorId)
    setActiveTab('clinical_monitoring')
  }

  const toggleDoctorValidation = async (doctorId, currentStatus) => {
    setIsUpdatingStatus(true)
    try {
      const backendHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
      const response = await fetch(`http://${backendHost}:8005/admin/doctors/${doctorId}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ validada: !currentStatus })
      })

      if (!response.ok) throw new Error('Error al actualizar el estado de validación en el servidor')
      
      setDoctors(prev => prev.map(doc => 
        doc.id === doctorId ? { ...doc, matricula_validada: !currentStatus } : doc
      ))
    } catch (err) {
      console.error('Error updating validation status:', err)
      alert('No se pudo actualizar el estado de validación.')
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setAuthError('')
    setAuthLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error
    } catch (err) {
      console.error('Login error:', err)
      setAuthError(err.message || 'Credenciales incorrectas. Intente de nuevo.')
      setAuthLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  const grafanaHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
  const grafanaUrlMedico = `http://${grafanaHost}:3001/d-solo/adhdgt8/ddc-panel-de-control?orgId=1&from=now-90d&to=now&timezone=utc&var-paciente=${selectedPatient}&panelId=1&_t=${refreshKey}`
  const grafanaUrlAdmin = `http://${grafanaHost}:3001/d-solo/adhdgt8/ddc-panel-de-control?orgId=1&from=now-90d&to=now&timezone=utc&var-paciente=${selectedAdminPatient}&panelId=1&_t=${refreshKey}`

  const selectedPatientName = patients.find(p => p.id === selectedPatient)?.nombre_completo || 'Cargando...'
  const selectedAdminPatientName = adminPatients.find(p => p.id === selectedAdminPatient)?.nombre_completo || 'Sin pacientes'

  if (isLoading) {
    return (
      <div className="h-screen bg-slate-50 flex flex-col items-center justify-center">
        <RefreshCw className="animate-spin text-primary-500 mb-4" size={40} />
        <p className="text-slate-600 font-medium">Iniciando sesión segura...</p>
      </div>
    )
  }

  if (!session || !userProfile) {
    return (
      <div className="h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-primary-950 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-xl p-8 rounded-3xl w-full max-w-md border border-white/20 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-500/30">
              <Activity className="text-white" size={32} />
            </div>
            <h1 className="text-2xl font-bold text-white">Pasitos Firmes</h1>
            <p className="text-sm text-slate-300 mt-1">Portal Clínico & Analítico de DDC</p>
          </div>

          {authError && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-200 text-sm p-3 rounded-xl mb-6 text-center">
              {authError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">Correo Electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@tesis.com" 
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">Contraseña</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={authLoading}
              className="w-full bg-primary-500 hover:bg-primary-600 active:bg-primary-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-primary-500/20 transition-all flex items-center justify-center gap-2"
            >
              {authLoading ? (
                <RefreshCw className="animate-spin" size={20} />
              ) : (
                <span>Ingresar al Sistema</span>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <p className="text-xs text-slate-400">Acceso clínico exclusivo para personal autorizado.</p>
          </div>
        </div>
      </div>
    )
  }

  if (userProfile.rol === 'admin') {
    return (
      <div className="flex h-screen bg-slate-50">
        <aside className="w-64 bg-slate-900 text-white flex flex-col">
          <div className="p-6">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Activity className="text-primary-500" />
              <span>Pasitos Firmes</span>
            </h1>
            <p className="text-xs text-primary-400 font-semibold tracking-wider uppercase mt-1 flex items-center gap-1">
              <Shield size={12} />
              Administrador
            </p>
          </div>

          <nav className="flex-1 px-4 space-y-2">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
            >
              <LayoutDashboard size={20} />
              <span>Dashboard Global</span>
            </button>
            
            <button 
              onClick={() => setActiveTab('doctors')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'doctors' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
            >
              <Users size={20} />
              <span>Médicos Registrados</span>
            </button>

            <button 
              onClick={() => setActiveTab('clinical_monitoring')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'clinical_monitoring' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
            >
              <Activity size={20} />
              <span>Seguimiento Clínico</span>
            </button>

            <button
              onClick={() => { setActiveTab('manage_patients'); fetchAllPatients(); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'manage_patients' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
            >
              <Baby size={20} />
              <span>Gestión Pacientes</span>
            </button>

            <button
              onClick={() => { setActiveTab('prescripciones'); fetchPrescripciones(); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'prescripciones' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
            >
              <Dumbbell size={20} />
              <span>Prescripciones</span>
            </button>
          </nav>

          <div className="p-4 border-t border-slate-800">
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white transition-colors"
            >
              <LogOut size={20} />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden">
          <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8">
            <h2 className="font-bold text-slate-700">Consola de Control del Sistema</h2>
            <div className="flex items-center gap-4">
              <button
                onClick={handleSyncData}
                disabled={isSyncing}
                className="flex items-center gap-2 px-3 py-1.5 bg-primary-50 hover:bg-primary-100 disabled:bg-slate-100 text-primary-600 disabled:text-slate-400 rounded-xl text-sm font-bold shadow-sm transition-all"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Analítica'}</span>
              </button>
              <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                <div className="text-right">
                  <p className="text-sm font-semibold">{userProfile.nombre_completo}</p>
                  <p className="text-xs text-red-500 font-medium">Administrador</p>
                </div>
                <div className="w-10 h-10 bg-red-100 text-red-700 rounded-full flex items-center justify-center font-bold">
                  A
                </div>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-7xl mx-auto">
              {activeTab === 'dashboard' && (
                <div>
                  <div className="mb-6">
                    <h3 className="text-2xl font-bold text-slate-800">Monitoreo Operacional</h3>
                    <p className="text-slate-500">Métricas de carga de base de datos e infraestructura global</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                      <p className="text-sm text-slate-500 font-medium mb-1">Médicos Registrados</p>
                      <h3 className="text-3xl font-bold text-slate-800">{globalStats.totalDoctors}</h3>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                      <p className="text-sm text-slate-500 font-medium mb-1">Pacientes en Tratamiento</p>
                      <h3 className="text-3xl font-bold text-slate-800">{globalStats.totalPatients}</h3>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                      <p className="text-sm text-slate-500 font-medium mb-1">Análisis de IA Totales</p>
                      <h3 className="text-3xl font-bold text-medical-accent">{globalStats.totalAnalisis}</h3>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-bold text-slate-700 flex items-center gap-2">
                        <Activity className="text-primary-500" />
                        Rendimiento del Servidor y Carga del Motor IA (YOLOv8)
                      </h4>
                    </div>
                    <div className="w-full h-[400px] bg-slate-100 rounded-xl flex items-center justify-center border border-slate-200 text-slate-400">
                      <div className="text-center">
                        <Activity size={48} className="mx-auto mb-2 text-slate-300" />
                        <p className="font-medium text-sm">Visualización del Dashboard del Servidor</p>
                        <p className="text-xs text-slate-400 mt-1">Conectado a InfluxDB bucket: telemetry</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'doctors' && (
                <div>
                  <div className="mb-6">
                    <h3 className="text-2xl font-bold text-slate-800">Médicos de la Plataforma</h3>
                    <p className="text-slate-500">Valide y audite las matrículas profesionales de los especialistas registrados</p>
                  </div>

                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="p-4 text-xs font-bold text-slate-400 uppercase">Médico</th>
                          <th className="p-4 text-xs font-bold text-slate-400 uppercase">Matrícula</th>
                          <th className="p-4 text-xs font-bold text-slate-400 uppercase">Teléfono</th>
                          <th className="p-4 text-xs font-bold text-slate-400 uppercase">Estado Validación</th>
                          <th className="p-4 text-xs font-bold text-slate-400 uppercase text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {doctors.map(doc => (
                          <tr key={doc.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                            <td className="p-4">
                              <div className="font-semibold text-slate-800">{doc.nombre_completo}</div>
                              <div className="text-xs text-slate-400">ID: {doc.id}</div>
                            </td>
                            <td className="p-4 text-slate-600 font-mono text-sm">
                              {doc.matricula_profesional || 'No especificada'}
                            </td>
                            <td className="p-4 text-slate-600 text-sm">
                              {doc.telefono || 'Sin teléfono'}
                            </td>
                            <td className="p-4">
                              {doc.matricula_validada ? (
                                <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">
                                  <CheckCircle size={14} /> Validada
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-xs font-semibold">
                                  <XCircle size={14} /> Pendiente
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-right">
                              <button
                                onClick={() => handleMonitorDoctor(doc.id)}
                                className="mr-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-primary-50 hover:bg-primary-100 text-primary-600 shadow-sm transition-all flex items-center gap-1 inline-flex"
                              >
                                <Activity size={14} />
                                <span>Ver Pacientes</span>
                              </button>
                              <button
                                disabled={isUpdatingStatus}
                                onClick={() => toggleDoctorValidation(doc.id, doc.matricula_validada)}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all ${
                                  doc.matricula_validada 
                                    ? 'bg-red-50 hover:bg-red-100 text-red-600' 
                                    : 'bg-green-50 hover:bg-green-100 text-green-600'
                                }`}
                              >
                                {doc.matricula_validada ? 'Inhabilitar' : 'Validar Matrícula'}
                              </button>
                            </td>
                          </tr>
                        ))}
                        {doctors.length === 0 && (
                          <tr>
                            <td colSpan="5" className="p-8 text-center text-slate-400">
                              No hay médicos registrados.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'clinical_monitoring' && (
                <div>
                  <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-2xl font-bold text-slate-800">Auditoría Clínico-Analítica</h3>
                      <p className="text-slate-500">Supervise la evolución médica y el progreso terapéutico por doctor y paciente</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-slate-400 uppercase ml-2">Médico:</label>
                        <select 
                          value={selectedDoctor}
                          onChange={(e) => handleDoctorChange(e.target.value)}
                          className="bg-slate-50 border-none rounded-lg text-sm font-semibold text-primary-600 focus:ring-0 cursor-pointer px-4 py-1.5"
                        >
                          {doctors.map(doc => (
                            <option key={doc.id} value={doc.id}>
                              {doc.nombre_completo}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-px h-6 bg-slate-200"></div>

                      <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-slate-400 uppercase ml-2">Paciente:</label>
                        <select 
                          value={selectedAdminPatient}
                          onChange={(e) => setSelectedAdminPatient(e.target.value)}
                          className="bg-slate-50 border-none rounded-lg text-sm font-semibold text-primary-600 focus:ring-0 cursor-pointer px-4 py-1.5"
                        >
                          {adminPatients.map(patient => (
                            <option key={patient.id} value={patient.id}>
                              {patient.nombre_completo}
                            </option>
                          ))}
                          {adminPatients.length === 0 && <option value="">Sin pacientes</option>}
                        </select>
                      </div>
                    </div>
                  </header>

                  <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-slate-700 flex items-center gap-2">
                        <Activity className="text-primary-500" size={18} />
                        Historial Clínico: <span className="text-primary-600 underline">{selectedAdminPatientName}</span>
                      </h3>
                      <span className="text-xs bg-medical-accent/10 text-medical-accent px-3 py-1 rounded-full font-medium"> Modo de Supervisión </span>
                    </div>

                    {selectedAdminPatient ? (
                      <div className="w-full h-[500px]">
                        <iframe 
                          key={`${selectedAdminPatient}-${refreshKey}`}
                          src={grafanaUrlAdmin} 
                          width="100%" 
                          height="105%" 
                          frameBorder="0"
                          className="rounded-xl"
                        ></iframe>
                      </div>
                    ) : (
                      <div className="w-full h-[400px] bg-slate-50 border border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-400">
                        <div className="text-center">
                          <Activity size={40} className="mx-auto mb-2 text-slate-300 animate-pulse" />
                          <p className="font-medium text-sm">Este médico no tiene pacientes asignados.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'manage_patients' && (
                <div>
                  <div className="mb-6 flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-slate-800">Gestión de Pacientes</h3>
                      <p className="text-slate-500">Cree, edite o elimine registros de pacientes del sistema</p>
                    </div>
                    <button
                      onClick={handleOpenCreatePatient}
                      className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold shadow-lg shadow-primary-500/25 transition-all"
                    >
                      <Plus size={18} />
                      <span>Añadir Paciente</span>
                    </button>
                  </div>

                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="p-4 text-xs font-bold text-slate-400 uppercase">Paciente</th>
                          <th className="p-4 text-xs font-bold text-slate-400 uppercase">Tutor / Teléfono</th>
                          <th className="p-4 text-xs font-bold text-slate-400 uppercase">Sexo / Ed. Gest.</th>
                          <th className="p-4 text-xs font-bold text-slate-400 uppercase">Médico Asignado</th>
                          <th className="p-4 text-xs font-bold text-slate-400 uppercase">Antecedentes</th>
                          <th className="p-4 text-xs font-bold text-slate-400 uppercase text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allPatients.map(patient => (
                          <tr key={patient.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                                  {patient.nombre_completo?.charAt(0) || '?'}
                                </div>
                                <div>
                                  <div className="font-semibold text-slate-800 text-sm">{patient.nombre_completo}</div>
                                  <div className="text-xs text-primary-500 font-mono font-bold">{patient.codigo_paciente || 'Sin código'}</div>
                                  <div className="text-xs text-slate-400">{patient.fecha_nacimiento || '—'}</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="text-sm font-medium text-slate-700">{patient.nombre_tutor || <span className="text-slate-300 italic">Sin tutor</span>}</div>
                              <div className="text-xs text-slate-400">{patient.telefono_contacto || '—'}</div>
                            </td>
                            <td className="p-4">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${patient.sexo === 'F' ? 'bg-pink-50 text-pink-700' : 'bg-blue-50 text-blue-700'}`}>
                                {patient.sexo === 'F' ? '♀ F' : '♂ M'}
                              </span>
                              {patient.edad_gestacional && (
                                <div className="text-xs text-slate-400 mt-0.5">{patient.edad_gestacional} sem.</div>
                              )}
                            </td>
                            <td className="p-4 text-slate-600 text-sm">{patient.medico?.nombre_completo || 'Sin asignar'}</td>
                            <td className="p-4">
                              <div className="flex flex-col gap-1">
                                {patient.presentacion_nalgas && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-50 text-orange-600">Pres. Nalgas</span>
                                )}
                                {patient.antecedente_familiar && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-600">Ant. Familiar</span>
                                )}
                                {!patient.presentacion_nalgas && !patient.antecedente_familiar && (
                                  <span className="text-xs text-slate-300">Ninguno</span>
                                )}
                              </div>
                            </td>
                            <td className="p-4 text-right whitespace-nowrap">
                              <button
                                onClick={() => handleOpenEditPatient(patient)}
                                className="mr-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-600 shadow-sm transition-all"
                              >
                                <Pencil size={13} />
                                <span>Editar</span>
                              </button>
                              <button
                                onClick={() => handleDeletePatient(patient)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 hover:bg-red-100 text-red-600 shadow-sm transition-all"
                              >
                                <Trash2 size={13} />
                                <span>Eliminar</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                        {allPatients.length === 0 && (
                          <tr>
                            <td colSpan="6" className="p-10 text-center">
                              <Baby size={36} className="mx-auto mb-3 text-slate-300" />
                              <p className="text-slate-400 font-medium">No hay pacientes registrados en el sistema.</p>
                              <p className="text-slate-300 text-sm mt-1">Usa el botón "Añadir Paciente" para registrar el primero.</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'prescripciones' && (() => {
                const prescFiltradas = prescripcionesFilterMedico === 'todos'
                  ? prescripciones
                  : prescripciones.filter(p => p.medico?.id === prescripcionesFilterMedico)

                const conteoEjercicios = prescripciones.reduce((acc, p) => {
                  acc[p.ejercicio_id] = (acc[p.ejercicio_id] || 0) + 1
                  return acc
                }, {})
                const ejercicioTop = Object.entries(conteoEjercicios).sort((a, b) => b[1] - a[1])[0]
                const pacientesConPrescrip = new Set(prescripciones.map(p => p.paciente_id)).size

                return (
                  <div>
                    <div className="mb-6 flex items-center justify-between">
                      <div>
                        <h3 className="text-2xl font-bold text-slate-800">Prescripciones de Rehabilitación</h3>
                        <p className="text-slate-500">Supervisión global de ejercicios asignados a pacientes con DDC</p>
                      </div>
                      <button
                        onClick={fetchPrescripciones}
                        disabled={prescripcionesLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-primary-50 hover:bg-primary-100 disabled:bg-slate-100 text-primary-600 disabled:text-slate-400 rounded-xl text-sm font-bold transition-all"
                      >
                        <RefreshCw className={`w-4 h-4 ${prescripcionesLoading ? 'animate-spin' : ''}`} />
                        Actualizar
                      </button>
                    </div>

                    {/* KPIs */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <p className="text-sm text-slate-500 font-medium mb-1">Total Prescripciones Activas</p>
                        <h3 className="text-3xl font-bold text-slate-800">{prescripciones.length}</h3>
                      </div>
                      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <p className="text-sm text-slate-500 font-medium mb-1">Pacientes con Ejercicios Asignados</p>
                        <h3 className="text-3xl font-bold text-primary-600">{pacientesConPrescrip}</h3>
                      </div>
                      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <p className="text-sm text-slate-500 font-medium mb-1">Ejercicio Más Prescrito</p>
                        <h3 className="text-xl font-bold text-medical-accent truncate">
                          {ejercicioTop
                            ? `${CATALOGO_EJERCICIOS_WEB[ejercicioTop[0]]?.emoji || '🏋️'} ${CATALOGO_EJERCICIOS_WEB[ejercicioTop[0]]?.titulo || ejercicioTop[0]}`
                            : '—'}
                        </h3>
                        {ejercicioTop && <p className="text-xs text-slate-400 mt-0.5">{ejercicioTop[1]} asignaciones</p>}
                      </div>
                    </div>

                    {/* Filtro por médico */}
                    <div className="mb-4 flex items-center gap-3 flex-wrap">
                      <span className="text-xs font-bold text-slate-400 uppercase">Filtrar por médico:</span>
                      <button
                        onClick={() => setPrescripcionesFilterMedico('todos')}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${prescripcionesFilterMedico === 'todos' ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                      >
                        Todos ({prescripciones.length})
                      </button>
                      {doctors.map(doc => {
                        const count = prescripciones.filter(p => p.medico?.id === doc.id).length
                        return (
                          <button
                            key={doc.id}
                            onClick={() => setPrescripcionesFilterMedico(doc.id)}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${prescripcionesFilterMedico === doc.id ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                          >
                            {doc.nombre_completo} ({count})
                          </button>
                        )
                      })}
                    </div>

                    {/* Tabla */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="p-4 text-xs font-bold text-slate-400 uppercase">Paciente</th>
                            <th className="p-4 text-xs font-bold text-slate-400 uppercase">Médico</th>
                            <th className="p-4 text-xs font-bold text-slate-400 uppercase">Ejercicio</th>
                            <th className="p-4 text-xs font-bold text-slate-400 uppercase text-center">Frec. Diaria</th>
                            <th className="p-4 text-xs font-bold text-slate-400 uppercase">Asignado</th>
                            <th className="p-4 text-xs font-bold text-slate-400 uppercase text-right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {prescripcionesLoading ? (
                            <tr>
                              <td colSpan="6" className="p-10 text-center text-slate-400">
                                <RefreshCw className="animate-spin mx-auto mb-2" size={28} />
                                Cargando prescripciones...
                              </td>
                            </tr>
                          ) : prescFiltradas.length === 0 ? (
                            <tr>
                              <td colSpan="6" className="p-10 text-center">
                                <Dumbbell size={36} className="mx-auto mb-3 text-slate-300" />
                                <p className="text-slate-400 font-medium">No hay prescripciones registradas.</p>
                                <p className="text-slate-300 text-sm mt-1">Los médicos asignan ejercicios desde la app móvil.</p>
                              </td>
                            </tr>
                          ) : prescFiltradas.map(p => {
                            const ej = CATALOGO_EJERCICIOS_WEB[p.ejercicio_id]
                            const fecha = p.creado_at ? new Date(p.creado_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
                            return (
                              <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                <td className="p-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                                      {p.paciente?.nombre_completo?.charAt(0) || '?'}
                                    </div>
                                    <div>
                                      <div className="font-semibold text-slate-800 text-sm">{p.paciente?.nombre_completo || 'Sin nombre'}</div>
                                      <div className="text-xs text-primary-500 font-mono font-bold">{p.paciente?.codigo_paciente || '—'}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="p-4 text-sm text-slate-600">{p.medico?.nombre_completo || '—'}</td>
                                <td className="p-4">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xl">{ej?.emoji || '🏋️'}</span>
                                    <div>
                                      <div className="text-sm font-semibold text-slate-800">{ej?.titulo || p.ejercicio_id}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="p-4 text-center">
                                  <span className="inline-flex items-center justify-center w-8 h-8 bg-primary-50 text-primary-700 rounded-full text-sm font-bold">
                                    {p.frecuencia_diaria || 1}
                                  </span>
                                </td>
                                <td className="p-4 text-sm text-slate-500">{fecha}</td>
                                <td className="p-4 text-right">
                                  <button
                                    onClick={() => handleDeletePrescripcion(p.id)}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 hover:bg-red-100 text-red-600 shadow-sm transition-all"
                                  >
                                    <Trash2 size={13} />
                                    <span>Eliminar</span>
                                  </button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              })()}

            </div>
          </div>
        </main>

        {showPatientModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-8 pt-8 pb-2 flex-shrink-0">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">
                    {editingPatient ? 'Editar Paciente' : 'Nuevo Paciente'}
                  </h3>
                  <p className="text-sm text-slate-400 mt-0.5">
                    {editingPatient ? 'Modifica los datos del expediente clínico' : 'Registra un nuevo paciente en el sistema'}
                  </p>
                </div>
                <button
                  onClick={handleClosePatientModal}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors text-lg leading-none"
                >✕</button>
              </div>
              <form onSubmit={handleSavePatient} className="px-8 pb-8 pt-4 space-y-4 overflow-y-auto">

                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">👶 Datos del Bebé</p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Nombre Completo *</label>
                    <input
                      required type="text" value={patientForm.nombre_completo}
                      onChange={e => setPatientForm(p => ({ ...p, nombre_completo: e.target.value }))}
                      placeholder="Ej: María García López"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Fecha de Nacimiento *</label>
                    <input
                      required type="date" value={patientForm.fecha_nacimiento}
                      onChange={e => setPatientForm(p => ({ ...p, fecha_nacimiento: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Sexo *</label>
                    <div className="flex gap-2">
                      {['M', 'F'].map(s => (
                        <button key={s} type="button"
                          onClick={() => setPatientForm(p => ({ ...p, sexo: s }))}
                          className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
                            patientForm.sexo === s
                              ? 'border-primary-500 bg-primary-50 text-primary-700'
                              : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                          }`}
                        >{s === 'M' ? '♂ M' : '♀ F'}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Edad Gestacional (sem.)</label>
                    <input
                      type="number" min="20" max="45" value={patientForm.edad_gestacional}
                      onChange={e => setPatientForm(p => ({ ...p, edad_gestacional: e.target.value }))}
                      placeholder="Ej: 38"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Código Paciente</label>
                    <input
                      readOnly value={patientForm.codigo_paciente || (editingPatient?.codigo_paciente || '—')}
                      className="w-full px-4 py-2.5 border border-slate-100 bg-slate-50 rounded-xl text-sm font-mono text-primary-600 font-bold outline-none"
                    />
                  </div>
                </div>

                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 pt-2">👨‍👩‍👧 Datos del Tutor</p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Nombre del Tutor *</label>
                    <input
                      required type="text" value={patientForm.nombre_tutor}
                      onChange={e => setPatientForm(p => ({ ...p, nombre_tutor: e.target.value }))}
                      placeholder="Ej: Carlos López"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Teléfono de Contacto</label>
                    <input
                      type="tel" value={patientForm.telefono_contacto}
                      onChange={e => setPatientForm(p => ({ ...p, telefono_contacto: e.target.value }))}
                      placeholder="Ej: +52 555 000 0000"
                      className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                </div>

                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 pt-2">⚠️ Antecedentes Clínicos</p>

                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                    <input
                      type="checkbox" checked={patientForm.presentacion_nalgas}
                      onChange={e => setPatientForm(p => ({ ...p, presentacion_nalgas: e.target.checked }))}
                      className="w-4 h-4 text-primary-600 rounded"
                    />
                    <div>
                      <div className="text-sm font-semibold text-slate-700">Presentación Pélvica (Nalgas)</div>
                      <div className="text-xs text-slate-400">Factor de riesgo detectado en nacimiento</div>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                    <input
                      type="checkbox" checked={patientForm.antecedente_familiar}
                      onChange={e => setPatientForm(p => ({ ...p, antecedente_familiar: e.target.checked }))}
                      className="w-4 h-4 text-primary-600 rounded"
                    />
                    <div>
                      <div className="text-sm font-semibold text-slate-700">Antecedentes Familiares de DDC</div>
                      <div className="text-xs text-slate-400">Historial familiar de displasia</div>
                    </div>
                  </label>
                </div>

                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 pt-2">👨‍⚕️ Médico Responsable</p>

                <div>
                  <select
                    required value={patientForm.medico_id}
                    onChange={e => setPatientForm(p => ({ ...p, medico_id: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all bg-white"
                  >
                    <option value="">— Seleccione un médico —</option>
                    {doctors.map(doc => (
                      <option key={doc.id} value={doc.id}>{doc.nombre_completo}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button" onClick={handleClosePatientModal}
                    className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
                  >Cancelar</button>
                  <button
                    type="submit"
                    disabled={patientActionLoading || !patientForm.medico_id || !patientForm.nombre_tutor}
                    className="flex-1 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    {patientActionLoading && <RefreshCw className="animate-spin" size={16} />}
                    {editingPatient ? 'Guardar Cambios' : 'Crear Paciente'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Activity className="text-primary-500" />
            <span>Pasitos Firmes</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">Portal del Especialista</p>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <LayoutDashboard size={20} />
            <span>Dashboard Global</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('patients')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'patients' ? 'bg-primary-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <Users size={20} />
            <span>Mis Pacientes</span>
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white transition-colors"
          >
            <LogOut size={20} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar paciente por nombre..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-full text-sm focus:ring-2 focus:ring-primary-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-400 hover:text-primary-500 relative">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
              <div className="text-right">
                <p className="text-sm font-semibold">{userProfile.nombre_completo}</p>
                <p className="text-xs text-slate-500">Traumatólogo Especialista</p>
              </div>
              <div className="w-10 h-10 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center font-bold">
                M
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto">
            
            {activeTab === 'dashboard' && (
              <div>
                <header className="mb-8 flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">Panel de Analítica Clínica</h2>
                    <p className="text-slate-500">Monitoreo en tiempo real de la rehabilitación DDC</p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleSyncData}
                      disabled={isSyncing}
                      className="flex items-center gap-2 px-3 py-1.5 bg-primary-50 hover:bg-primary-100 disabled:bg-slate-100 text-primary-600 disabled:text-slate-400 rounded-xl text-sm font-bold shadow-sm transition-all"
                    >
                      <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Analítica'}</span>
                    </button>
                    
                    <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                      <label className="text-xs font-bold text-slate-400 uppercase ml-2">Paciente:</label>
                      <select 
                        value={selectedPatient}
                        onChange={(e) => setSelectedPatient(e.target.value)}
                        className="bg-slate-50 border-none rounded-lg text-sm font-semibold text-primary-600 focus:ring-0 cursor-pointer px-4 py-1.5"
                      >
                        {patients.map(patient => (
                          <option key={patient.id} value={patient.id}>
                            {patient.nombre_completo}
                          </option>
                        ))}
                        {patients.length === 0 && <option value="">Sin pacientes</option>}
                      </select>
                    </div>
                  </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <p className="text-sm text-slate-500 font-medium mb-1">Mis Pacientes Activos</p>
                    <h3 className="text-3xl font-bold text-slate-800">{patients.length}</h3>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <p className="text-sm text-slate-500 font-medium mb-1">Alertas Clínicas</p>
                    <h3 className="text-3xl font-bold text-red-500">1</h3>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <p className="text-sm text-slate-500 font-medium mb-1">Promedio Mejora Semanal</p>
                    <h3 className="text-3xl font-bold text-medical-accent">+0.4°</h3>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2">
                      <Activity className="text-primary-500" size={18} />
                      Historial de Ángulos Acetabulares: <span className="text-primary-600 underline">{selectedPatientName}</span>
                    </h3>
                    <span className="text-xs bg-medical-accent/10 text-medical-accent px-3 py-1 rounded-full font-medium"> Actualizado ahora </span>
                  </div>
                  
                  {selectedPatient ? (
                    <div className="w-full h-[500px]">
                      <iframe 
                        key={`${selectedPatient}-${refreshKey}`} 
                        src={grafanaUrlMedico} 
                        width="100%" 
                        height="100%" 
                        frameBorder="0"
                        className="rounded-xl"
                      ></iframe>
                    </div>
                  ) : (
                    <div className="w-full h-[400px] bg-slate-50 border border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-400">
                      <p className="font-medium text-sm">No tienes pacientes registrados en tu historial.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'patients' && (
              <div>
                <h3 className="text-2xl font-bold text-slate-800 mb-4">Gestión de Pacientes</h3>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <p className="text-slate-500">Listado y edición de expedientes clínicos (en construcción)...</p>
                </div>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  )
}

export default App
