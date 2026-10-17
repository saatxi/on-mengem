#!/usr/bin/env bash
# Es crida des de "postversion" (npm version): obre l'editor de git amb "Release X"
# perquè puguis escriure el missatge del commit, i després crea l'etiqueta vX amb el mateix missatge.
set -euo pipefail

version="$(node -p "require('./package.json').version")"

git commit -e -m "Release ${version}" -- package.json package-lock.json
git log -1 --format=%B | git tag -a "v${version}" -F -
echo "Versió ${version} creada. Puja-la amb: git push && git push --tags"
