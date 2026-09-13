-- integrations.mode es un enum nativo de Postgres (IntegrationMode) que solo tenía 'AUTOMATIC'
-- dado de alta — por eso el selector de modalidad fallaba con "invalid input value for enum"
-- al intentar guardar 'CONFIRMATION' o 'PAUSED'.
alter type "IntegrationMode" add value if not exists 'CONFIRMATION';
alter type "IntegrationMode" add value if not exists 'PAUSED';
