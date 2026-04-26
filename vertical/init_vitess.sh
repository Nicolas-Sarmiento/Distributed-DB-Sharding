#!/bin/bash

# Función para ejecutar comandos de vtctldclient
vtclient() {
  /vt/bin/vtctldclient --server vtctld:15999 "$@"
}

echo "Esperando a que Vitess (vtctld) esté listo..."
sleep 10

echo "Creando Keyspaces..."
vtclient CreateKeyspace software_core || true
vtclient CreateKeyspace software_details || true

echo "Esperando a que las tablets se registren..."
sleep 15

echo "Configurando tablets primarias..."
vtclient TabletExternallyReparented zone1-0000000101 || true
vtclient TabletExternallyReparented zone1-0000000102 || true

echo "Aplicando esquemas SQL..."
vtclient ApplySchema --sql-file /vt/files/schema_core.sql software_core
vtclient ApplySchema --sql-file /vt/files/schema_details.sql software_details

echo "Aplicando VSchemas..."
vtclient ApplyVSchema --vschema-file /vt/files/vschema_core.json software_core
vtclient ApplyVSchema --vschema-file /vt/files/vschema_details.json software_details

echo "¡Configuración de Vitess completada automáticamente!"
