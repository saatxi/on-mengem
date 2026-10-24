# On mengem? — entorn local per fer proves (Supabase en Docker + Vite)
# El mode "localdb" de Vite llegeix .env.localdb, així no trepitja el .env del núvol.

SUPABASE := npx supabase
ENV_FILE := .env.localdb

# "make release patch": l'argument és un objectiu més, que es defineix buit perquè make no es queixi.
RELEASE_ARG := $(filter-out release,$(MAKECMDGOALS))
ifneq ($(filter release,$(MAKECMDGOALS)),)
$(RELEASE_ARG): ; @:
endif

.PHONY: help release local db-start db-stop db-status db-reset db-test db-types env dev clean-env

help: ## Mostra aquesta ajuda
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  make %-10s %s\n", $$1, $$2}'

release: ## Nova versió: make release patch|minor|major|0.2.0 (obre l'editor pel missatge)
	@test -n "$(RELEASE_ARG)" || { echo "Cal indicar la versió: make release patch|minor|major|0.2.0"; exit 1; }
	npm version $(RELEASE_ARG)

local: db-start env dev ## Arrenca la BD local i l'app apuntant-hi

db-start: ## Arrenca Supabase local (cal Docker; supabase/.env només per entrar amb Google)
	$(SUPABASE) start

db-stop: ## Atura Supabase local (conserva les dades)
	$(SUPABASE) stop

db-status: ## Mostra URL i claus de Supabase local
	$(SUPABASE) status

db-reset: ## Recrea la BD local des de les migracions i hi carrega les dades de prova (esborra les dades)
	@echo ">> Entorn LOCAL (Docker, 127.0.0.1:54322): es recrea la BD i es carreguen les dades de prova. Producció no es toca."
	$(SUPABASE) db reset --local
	@echo ">> BD local a punt. Usuaris de prova: marta|pau|laia|jordi|nuria@onmengem.local (contrasenya: onmengem)"

db-test: ## Executa els tests pgTAP de la BD
	$(SUPABASE) test db

db-types: ## Regenera els tipus TypeScript des de la BD local (src/supabase/database.types.ts)
	$(SUPABASE) gen types typescript --local > src/supabase/database.types.ts

env: ## Genera .env.localdb amb la URL i la clau de Supabase local
	@$(SUPABASE) status -o env 2>/dev/null | awk -F= \
		'$$1=="API_URL"{u=$$2} $$1=="PUBLISHABLE_KEY"{k=$$2} \
		 END{gsub(/"/,"",u); gsub(/"/,"",k); \
		 if(u==""||k==""){print "Supabase local no està en marxa: fes make db-start" > "/dev/stderr"; exit 1} \
		 print "VITE_SUPABASE_URL=" u; print "VITE_SUPABASE_ANON_KEY=" k}' > $(ENV_FILE).tmp
	@mv $(ENV_FILE).tmp $(ENV_FILE)
	@echo "Generat $(ENV_FILE)"

dev: ## Arrenca Vite contra la BD local (http://localhost:3000)
	@test -f $(ENV_FILE) || $(MAKE) env
	npx vite --mode localdb --port=3000 --host=0.0.0.0

clean-env: ## Esborra .env.localdb
	rm -f $(ENV_FILE) $(ENV_FILE).tmp
