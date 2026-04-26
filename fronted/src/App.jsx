import { useEffect, useMemo, useState } from 'react';

const initialForm = {
  package_name: '',
  package_version: '',
  package_license: '',
  author: '',
  repository_url: '',
  description: ''
};

const statusTemplate = [
  { key: 'send', text: '⟳ Enviando a VTGate...', wait: 0 },
  { key: 'core', text: '→ INSERT INTO software_core...', wait: 400 },
  { key: 'details', text: '→ INSERT INTO software_details...', wait: 500 },
  { key: 'done', text: '✓ Particionamiento completado · package_id: ', wait: 600 }
];

const API_BASE = 'http://localhost:3000';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shortUuid() {
  const chunk = () => Math.random().toString(16).slice(2, 6);
  return `${chunk()}-${chunk()}`;
}

function App() {
  const [form, setForm] = useState(initialForm);
  const [rows, setRows] = useState([]);
  const [statusLines, setStatusLines] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [flashId, setFlashId] = useState('');

  useEffect(() => {
    const loadPackages = async () => {
      try {
        const response = await fetch(`${API_BASE}/packages`);
        if (!response.ok) {
          throw new Error('No se pudieron cargar los paquetes desde el backend.');
        }

        const data = await response.json();
        const normalized = Array.isArray(data)
          ? data
              .map((item) => ({
                package_id: item.package_id,
                package_name: item.package_name,
                package_version: item.package_version,
                package_license: item.package_license,
                author: item.author,
                description: item.description,
                repository_url: item.repository_url,
                created_at: item.created_at
              }))
              .sort((a, b) => String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')))
          : [];

        setRows(normalized);
      } catch (error) {
        setStatusLines([`✗ Error cargando datos: ${error.message}`]);
      }
    };

    loadPackages();
  }, []);

  const metrics = useMemo(() => {
    const count = rows.length;
    return { total: count, core: count, details: count };
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

    let packageId = shortUuid();
    setIsSubmitting(true);
    setStatusLines([]);

    for (let i = 0; i < statusTemplate.length; i += 1) {
      const step = statusTemplate[i];
      await sleep(step.wait);
      const line =
        step.key === 'done' ? `${step.text}${packageId}` : step.text;
      setStatusLines((prev) => [...prev, line]);
    }

    try {
      const payload = {
        packageName: form.package_name,
        packageVersion: form.package_version,
        packageLicense: form.package_license,
        author: form.author,
        description: form.description,
        repositoryUrl: form.repository_url
      };

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
      packageId = createData.packageId || packageId;

      setStatusLines((prev) => {
        const lines = [...prev];
        lines[lines.length - 1] = `✓ Particionamiento completado · package_id: ${packageId}`;
        return lines;
      });

      const detailResponse = await fetch(`${API_BASE}/packages/${packageId}`);
      if (!detailResponse.ok) {
        throw new Error('No se pudo recuperar el paquete recién creado.');
      }

      const detailData = await detailResponse.json();
      const createdRow = detailData?.data;
      if (!createdRow) {
        throw new Error('Respuesta inválida al consultar el paquete creado.');
      }

      const newRow = {
        package_id: createdRow.package_id,
        package_name: createdRow.package_name,
        package_version: createdRow.package_version,
        package_license: createdRow.package_license,
        author: createdRow.author,
        description: createdRow.description,
        repository_url: createdRow.repository_url,
        created_at: createdRow.created_at
      };

      setRows((prev) => [newRow, ...prev]);
      clearFlashLater(packageId);
      setForm(initialForm);
    } catch (error) {
      setStatusLines((prev) => [...prev, `✗ Error backend: ${error.message}`]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page">
      <header className="topbar">
        <div className="brand-group">
          <h1>VITESS</h1>
          <p className="tech">PARTICIONAMIENTO VERTICAL</p>
        </div>
        <div className="status-group tech">
          <span className="dot" />
          <span>VTGate · localhost:15306</span>
          <span className="badge-vt">2 keyspaces</span>
        </div>
      </header>

      <main className="content">
        <section className="left-panel panel">
          <div className="section-title tech">INSERTAR PAQUETE</div>

          <div className="vt-note tech">VTGate enrutará automáticamente cada columna a su keyspace</div>

          <form onSubmit={handleSubmit}>
            <div className="keyspace-title tech">CAMPOS · software_core</div>
            <div className="chips">
              <span className="chip uuid">package_id PK · auto</span>
              <span className="chip core">package_name</span>
              <span className="chip core">package_version</span>
              <span className="chip core">package_license</span>
            </div>

            <label className="field-label" htmlFor="package_name">Nombre del paquete</label>
            <input
              id="package_name"
              name="package_name"
              value={form.package_name}
              onChange={handleChange}
              placeholder="ej. react"
              required
            />

            <div className="grid-two">
              <div>
                <label className="field-label" htmlFor="package_version">Versión</label>
                <input
                  id="package_version"
                  name="package_version"
                  value={form.package_version}
                  onChange={handleChange}
                  placeholder="18.2.0"
                  required
                />
              </div>
              <div>
                <label className="field-label" htmlFor="package_license">Licencia</label>
                <input
                  id="package_license"
                  name="package_license"
                  value={form.package_license}
                  onChange={handleChange}
                  placeholder="MIT"
                  required
                />
              </div>
            </div>

            <div className="keyspace-title tech">CAMPOS · software_details</div>
            <div className="chips">
              <span className="chip detail">package_id FK</span>
              <span className="chip detail">author</span>
              <span className="chip detail">description</span>
              <span className="chip detail">repository_url</span>
              <span className="chip detail">created_at auto</span>
            </div>

            <div className="grid-two">
              <div>
                <label className="field-label" htmlFor="author">Autor</label>
                <input
                  id="author"
                  name="author"
                  value={form.author}
                  onChange={handleChange}
                  placeholder="Meta"
                  required
                />
              </div>
              <div>
                <label className="field-label" htmlFor="repository_url">URL repositorio</label>
                <input
                  id="repository_url"
                  name="repository_url"
                  value={form.repository_url}
                  onChange={handleChange}
                  placeholder="github.com/..."
                  required
                />
              </div>
            </div>

            <label className="field-label" htmlFor="description">Descripción</label>
            <textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Librería de UI para React..."
              required
            />

            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Particionando...' : 'Insertar y particionar →'}
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
          <p className="diagram-note">Al insertar, VTGate divide el registro por columnas:</p>

          <div className="diagram">
            <div className="box core-box tech">
              <strong>Keyspace · software_core</strong>
              <span>packages_core</span>
              <span>package_id</span>
              <span>package_name</span>
              <span>package_version</span>
              <span>package_license</span>
            </div>
            <div className="fk-link tech">
              <span>UUID</span>
              <span>↔</span>
              <span>FK</span>
            </div>
            <div className="box detail-box tech">
              <strong>Keyspace · software_details</strong>
              <span>packages_details</span>
              <span>package_id</span>
              <span>author</span>
              <span>description</span>
              <span>repository_url</span>
              <span>created_at</span>
            </div>
          </div>

          <div className="join-banner tech">
            GET /packages <span>→ VTGate hace el JOIN entre keyspaces de forma transparente</span>
          </div>

          <div className="section-title tech">MÉTRICAS EN VIVO</div>
          <div className="metrics">
            <div className="metric dark">
              <small>Total</small>
              <strong>{metrics.total}</strong>
            </div>
            <div className="metric core-soft">
              <small>Núcleo</small>
              <strong>{metrics.core}</strong>
            </div>
            <div className="metric detail-soft">
              <small>Detalles</small>
              <strong>{metrics.details}</strong>
            </div>
          </div>
        </section>
      </main>

      <section className="table-panel panel">
        <div className="table-head">
          <div>
            <div className="section-title tech">REGISTROS INSERTADOS · JOIN entre keyspaces (VTGate)</div>
          </div>
          <div className="legend tech">
            <span className="legend-chip core">software_core</span>
            <span className="legend-chip detail">software_details</span>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr className="tech">
                <th className="uuid-head">package_id</th>
                <th className="core-head">nombre</th>
                <th className="core-head">versión</th>
                <th className="core-head">licencia</th>
                <th className="detail-head">autor</th>
                <th className="detail-head">descripción</th>
                <th className="detail-head">url_repositorio</th>
                <th className="detail-head">creado_en</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td className="empty tech" colSpan={8}>Sin registros aún — inserta el primero arriba</td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.package_id} className={flashId === row.package_id ? 'flash-row' : ''}>
                    <td className="tech">{row.package_id}</td>
                    <td>{row.package_name}</td>
                    <td className="tech">{row.package_version}</td>
                    <td className="tech">{row.package_license}</td>
                    <td>{row.author}</td>
                    <td>{row.description}</td>
                    <td className="tech">{row.repository_url}</td>
                    <td className="tech">{row.created_at}</td>
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

export default App;
