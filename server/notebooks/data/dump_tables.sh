#!/bin/bash
PGDATABASE="graph-node"

psql -Atc "select schema_name from information_schema.schemata" $PGDATABASE|\
    while read SCHEMA; do
    if [[ "$SCHEMA" != "pg_catalog" && "$SCHEMA" != "information_schema" ]]; then
        psql -Atc "select tablename from pg_tables where schemaname='$SCHEMA'"  $PGDATABASE |\
            while read TBL; do
                psql -c "COPY $SCHEMA.$TBL TO STDOUT WITH CSV DELIMITER ';' HEADER ENCODING 'UTF-8'"  $PGDATABASE > $SCHEMA.$TBL.csv
            done
    fi
    done