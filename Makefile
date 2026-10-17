# On menjem? — entorn local per fer proves (Supabase en Docker + Vite)
# El mode "localdb" de Vite llegeix .env.localdb, així no trepitja el .env del núvol.

SUPABASE := npx supabase
ENV_FILE := .env.localdb

.PHONY: help local db-start db-stop db-status db-reset db-test env dev clean-env

help: ## Mostra aquesta ajuda
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  make %-10s %s\n", $$1, $$2}'

local: db-start env dev ## Arrenca la BD local i l'app apuntant-hi

db-start: ## Arrenca Supabase local (cal Docker i supabase/.env)
	$(SUPABASE) start

db-stop: ## Atura Supabase local (conserva les dades)
	$(SUPABASE) stop

db-status: ## Mostra URL i claus de Supabase local
	$(SUPABASE) status

db-reset: ## Recrea la BD local des de les migracions (esborra les dades)
	$(SUPABASE) db reset

db-test: ## Executa els tests pgTAP de la BD
	$(SUPABASE) test db

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
