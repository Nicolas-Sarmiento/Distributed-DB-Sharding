import { useEffect, useMemo, useState } from 'react';

const initialForm = {
  packageName: '',
  packageVersion: '',
  packageLicense: ''
};

const statusTemplate = [
  { key: 'send', text: '⟳ Enviando a VTGate...', wait: 0 },
  { key: 'hash', text: '→ Calculando hash para VSchema...', wait: 400 },
  { key: 'route', text: '→ Enrutando al shard correspondiente...', wait: 500 },
  { key: 'done', text: '✓ Inserción completada · packageId: ', wait: 600 }
];

const API_BASE = 'http://localhost:5000';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shortUuid() {
  const chunk = () => Math.random().toString(16).slice(2, 6);
  return `${chunk()}-${chunk()}`;
}

function Horizontal() {
  const [form, setForm] = useState(initialForm);
  const [rows, setRows] = useState([]);
  const [statusLines, setStatusLines] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [flashId, setFlashId] = useState('');

  const loadPackages = async () => {
    try {
      const response = await fetch(`${API_BASE}/packages`);
      if (!response.ok) {
        throw new Error('No se pudieron cargar los paquetes desde el backend.');
      }

      const data = await response.json();
      const normalized = Array.isArray(data)
        ? data.map((item) => ({
              packageId: item.packageId,
              packageName: item.packageName,
              packageVersion: item.packageVersion,
              packageLicense: item.packageLicense,
              shard_ubicacion: 'Scatter-Gather (VTGate)'
            }))
        : [];

      setRows(normalized);
    } catch (error) {
      setStatusLines([`✗ Error cargando datos: ${error.message}`]);
    }
  };

  useEffect(() => {
    loadPackages();
  }, []);

  const handleDelete = async (id) => {
    try {
      const response = await fetch(`${API_BASE}/packages/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        throw new Error('Error al eliminar el paquete.');
      }
      setRows((prev) => prev.filter((r) => r.packageId !== id));
      setStatusLines([`✓ Paquete ${id} eliminado correctamente`]);
    } catch (error) {
      setStatusLines([`✗ Error al eliminar: ${error.message}`]);
    }
  };

  const fetchShard = async (shardName) => {
    try {
      setStatusLines([`Consultando shard ${shardName}...`]);
      const response = await fetch(`${API_BASE}/shard/${shardName}`);
      const data = await response.json();
      
      if (data.isDown) {
        setStatusLines([`✗ ALERTA: Shard ${shardName} no está disponible actualmente.`]);
        setRows([]);
      } else {
        setStatusLines([`✓ Shard ${shardName} consultado. Registros: ${data.count}`]);
        const normalized = data.data.map((item) => ({
          packageId: item.packageId,
          packageName: item.packageName,
          packageVersion: item.packageVersion,
          packageLicense: item.packageLicense,
          shard_ubicacion: shardName
        }));
        setRows(normalized);
      }
    } catch (error) {
      setStatusLines([`✗ Error al consultar shard: ${error.message}`]);
    }
  };

  const metrics = useMemo(() => {
    const count = rows.length;
    return { total: count };
  }, [rows]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const clearFlashLater = (id) => {
    setFlashId(id);
    setTimeout(() => {
      setFlashId((current) => (current === id ? '' : current));
    }, 1400);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    let tempId = shortUuid();
    setIsSubmitting(true);
    setStatusLines([]);

    for (let i = 0; i < statusTemplate.length; i += 1) {
      const step = statusTemplate[i];
      await sleep(step.wait);
      const line =
        step.key === 'done' ? `${step.text}${tempId}` : step.text;
      setStatusLines((prev) => [...prev, line]);
    }

    try {
      const payload = { ...form };

      const createResponse = await fetch(`${API_BASE}/packages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'No se pudo insertar el paquete.');
      }

      const createData = await createResponse.json();
      const newPackageId = createData.packageId || tempId;

      setStatusLines((prev) => {
        const lines = [...prev];
        lines[lines.length - 1] = `✓ Inserción completada · packageId: ${newPackageId}`;
        return lines;
      });

      const detailResponse = await fetch(`${API_BASE}/packages/${newPackageId}`);
      if (!detailResponse.ok) {
        throw new Error('No se pudo localizar el paquete.');
      }

      const detailData = await detailResponse.json();
      const createdRow = detailData?.data;
      if (!createdRow) {
        throw new Error('Respuesta inválida al consultar la ubicación del paquete.');
      }

      const newRow = {
        packageId: createdRow.packageId,
        packageName: createdRow.packageName,
        packageVersion: createdRow.packageVersion,
        packageLicense: createdRow.packageLicense,
        shard_ubicacion: detailData.shard_ubicacion || 'Desconocido'
      };

      setRows((prev) => [newRow, ...prev]);
      clearFlashLater(newPackageId);
      setForm(initialForm);
    } catch (error) {
      setStatusLines((prev) => [...prev, `✗ Error backend: ${error.message}`]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderChipClass = (shard) => {
    if (shard === '-55') return 'shard1';
    if (shard === '55-aa') return 'shard2';
    if (shard === 'aa-') return 'shard3';
    return '';
  };

  return (
    <div className="page">
      <header className="topbar">
        <div className="brand-group">
          <h1>VITESS</h1>
          <p className="tech">PARTICIONAMIENTO HORIZONTAL</p>
        </div>
        <div className="status-group tech">
          <span className="dot" />
          <span>VTGate · localhost:15306</span>
          <span className="badge-vt">3 shards activos</span>
        </div>
      </header>

      <main className="content">
        <section className="left-panel panel">
          <div className="section-title tech">INSERTAR PAQUETE</div>

          <div className="vt-note tech">VTGate calculará un hash para el ID y enrutará la fila al shard correspondiente de forma transparente.</div>

          <form onSubmit={handleSubmit}>
            <div className="keyspace-title tech">CAMPOS · software_packages</div>
            <div className="chips">
              <span className="chip uuid">packageId PK · auto</span>
              <span className="chip core">packageName</span>
              <span className="chip core">packageVersion</span>
              <span className="chip core">packageLicense</span>
            </div>

            <label className="field-label" htmlFor="packageName">Nombre del paquete</label>
            <input
              id="packageName"
              name="packageName"
              value={form.packageName}
              onChange={handleChange}
              placeholder="ej. express"
              required
            />

            <div className="grid-two">
              <div>
                <label className="field-label" htmlFor="packageVersion">Versión</label>
                <input
                  id="packageVersion"
                  name="packageVersion"
                  value={form.packageVersion}
                  onChange={handleChange}
                  placeholder="4.18.2"
                  required
                />
              </div>
              <div>
                <label className="field-label" htmlFor="packageLicense">Licencia</label>
                <input
                  id="packageLicense"
                  name="packageLicense"
                  value={form.packageLicense}
                  onChange={handleChange}
                  placeholder="MIT"
                  required
                />
              </div>
            </div>

            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Procesando...' : 'Insertar paquete →'}
            </button>

            <div className="status-box tech" aria-live="polite">
              {statusLines.length === 0 ? (
                <span className="status-placeholder">Esperando inserción...</span>
              ) : (
                statusLines.map((line) => (
                  <div key={line} className="status-line">{line}</div>
                ))
              )}
            </div>
          </form>
        </section>

        <section className="right-panel panel">
          <div className="section-title tech">DIAGRAMA DE PARTICIONAMIENTO</div>
          <p className="diagram-note">Al insertar, VTGate distribuye los registros entre los diferentes shards:</p>

          <div className="diagram">
            <div className={`box shard1-box tech`}>
              <strong>Shard · -55</strong>
              <span>software_packages</span>
              <span>Hash ID inferior a 55</span>
            </div>
            <div className="fk-link tech" style={{background: 'transparent', borderColor: 'transparent', color: '#6e6e6e'}}>
              <span>VSchema</span>
              <span>↔</span>
            </div>
            <div className={`box shard2-box tech`}>
              <strong>Shard · 55-aa</strong>
              <span>software_packages</span>
              <span>Hash ID entre 55 y aa</span>
            </div>
          </div>
          
          <div className="diagram" style={{marginTop: '10px'}}>
             <div className="fk-link tech" style={{background: 'transparent', borderColor: 'transparent', color: '#1a1a1a'}}>
            </div>
            <div className={`box shard3-box tech`}>
              <strong>Shard · aa-</strong>
              <span>software_packages</span>
              <span>Hash ID mayor a aa</span>
            </div>
            <div className="fk-link tech" style={{background: 'transparent', borderColor: 'transparent', color: '#1a1a1a'}}>
            </div>
          </div>

          <div className="join-banner tech">
            GET /packages <span>→ VTGate hace un Scatter-Gather ejecutando la consulta en paralelo sobre todos los shards</span>
          </div>

          <div className="shard-actions tech" style={{marginTop: '20px', display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
            <button type="button" onClick={() => fetchShard('-55')} style={{padding: '6px 12px', fontSize: '12px', border: '1px solid #00c6a5', background: 'transparent', color: '#00c6a5', borderRadius: '4px', cursor: 'pointer'}}>Ver '-55'</button>
            <button type="button" onClick={() => fetchShard('55-aa')} style={{padding: '6px 12px', fontSize: '12px', border: '1px solid #aa55ff', background: 'transparent', color: '#aa55ff', borderRadius: '4px', cursor: 'pointer'}}>Ver '55-aa'</button>
            <button type="button" onClick={() => fetchShard('aa-')} style={{padding: '6px 12px', fontSize: '12px', border: '1px solid #ff7700', background: 'transparent', color: '#ff7700', borderRadius: '4px', cursor: 'pointer'}}>Ver 'aa-'</button>
            <button type="button" onClick={loadPackages} style={{padding: '6px 12px', fontSize: '12px', background: '#333', border: 'none', color: '#fff', borderRadius: '4px', cursor: 'pointer'}}>↻ Todos (Scatter-Gather)</button>
          </div>

          <div className="section-title tech">MÉTRICAS EN VIVO</div>
          <div className="metrics">
            <div className="metric dark">
              <small>Total Registros</small>
              <strong>{metrics.total}</strong>
            </div>
             <div className="metric shard2-box" style={{gridColumn: 'span 2'}}>
              <small>Shards Activos</small>
              <strong>3</strong>
            </div>
          </div>
        </section>
      </main>

      <section className="table-panel panel">
        <div className="table-head">
          <div>
            <div className="section-title tech">REGISTROS EXISTENTES · Scatter Gather (VTGate)</div>
          </div>
          <div className="legend tech" style={{opacity: 0.8}}>
            <span className="legend-chip shard1">-55</span>
            <span className="legend-chip shard2">55-aa</span>
            <span className="legend-chip shard3">aa-</span>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr className="tech">
                <th className="uuid-head">packageId</th>
                <th className="core-head">nombre</th>
                <th className="core-head">versión</th>
                <th className="core-head">licencia</th>
                <th className="uuid-head" style={{paddingLeft: '16px'}}>ubicación física (shard)</th>
                <th className="core-head" style={{textAlign: 'right', paddingRight: '16px'}}>acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td className="empty tech" colSpan={6}>No hay registros a mostrar.</td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.packageId} className={flashId === row.packageId ? 'flash-row' : ''}>
                    <td className="tech">{row.packageId}</td>
                    <td>{row.packageName}</td>
                    <td className="tech">{row.packageVersion}</td>
                    <td className="tech">{row.packageLicense}</td>
                    <td className="tech" style={{paddingLeft: '16px'}}>
                      {row.shard_ubicacion && row.shard_ubicacion !== 'Scatter-Gather (VTGate)' ? (
                        <span className={`chip ${renderChipClass(row.shard_ubicacion)}`}>{row.shard_ubicacion}</span>
                      ) : (
                         <span style={{color: '#8a8a8a', fontStyle: 'italic', fontSize: '12px'}}>{row.shard_ubicacion}</span>
                      )}
                    </td>
                    <td style={{textAlign: 'right', paddingRight: '16px'}}>
                      <button 
                        onClick={() => handleDelete(row.packageId)}
                        style={{background: 'transparent', color: '#ff4d4f', border: '1px solid #ff4d4f', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px'}}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default Horizontal;
