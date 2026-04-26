#!/bin/sh

set -eu

vtclient() {
  /vt/bin/vtctldclient --server vtctld:15999 "$@"
}

has_primary_core() {
  vtclient GetShard software_core/0 | grep -q '"uid": 101'
}

has_primary_details() {
  vtclient GetShard software_details/0 | grep -q '"uid": 102'
}

retry_cmd() {
  attempts="$1"
  delay_seconds="$2"
  shift 2

  i=1
  while [ "$i" -le "$attempts" ]; do
    if "$@"; then
      return 0
    fi

    echo "Intento $i/$attempts fallido para: $*"
    if [ "$i" -lt "$attempts" ]; then
      sleep "$delay_seconds"
    fi
    i=$((i + 1))
  done

  return 1
}

echo "Esperando a que vtctld esté listo..."
retry_cmd 30 2 vtclient GetKeyspaces >/dev/null

echo "Creando keyspaces..."
vtclient CreateKeyspace software_core || true
vtclient CreateKeyspace software_details || true

echo "Esperando a que las tablets aparezcan en topología..."
retry_cmd 30 2 vtclient GetTablet zone1-0000000101 >/dev/null
retry_cmd 30 2 vtclient GetTablet zone1-0000000102 >/dev/null

echo "Promoviendo primarias en cada shard..."
retry_cmd 20 2 vtclient TabletExternallyReparented zone1-0000000101
retry_cmd 20 2 vtclient TabletExternallyReparented zone1-0000000102

echo "Esperando confirmación de primary_alias..."
retry_cmd 20 2 has_primary_core
retry_cmd 20 2 has_primary_details

echo "Aplicando esquemas SQL..."
retry_cmd 15 2 vtclient ApplySchema --sql-file /vt/files/schema_core.sql software_core
retry_cmd 15 2 vtclient ApplySchema --sql-file /vt/files/schema_details.sql software_details

echo "Aplicando vschema..."
retry_cmd 15 2 vtclient ApplyVSchema --vschema-file /vt/files/vschema_core.json software_core
retry_cmd 15 2 vtclient ApplyVSchema --vschema-file /vt/files/vschema_details.json software_details

echo "Inicialización completada: keyspaces, primarias, schema y vschema listos."
