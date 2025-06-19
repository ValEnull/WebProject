#!/usr/bin/env bash
host="$1"
port="$2"

shift 2

timeout=15

echo "Aspetto che $host:$port sia pronto..."

for i in $(seq $timeout); do
  nc -z "$host" "$port" && break
  echo -n "."
  sleep 1
done

echo
exec "$@"