# 📋 Backlogs

## Ideias a serem pensadas

Backlog para ideias futuras e estudo

### Issues

| ID | Tipo | Título | Descrição | Status | Dependências |
| --- | --- | --- | --- | --- | --- |
| ideias.cdc | 🌟 Epic | Estudar CDC | - | - | - |

---

## Backlog do BI

Backlog dedicado a equipe de BI

### Issues

| ID | Tipo | Título | Descrição | Status | Dependências |
| --- | --- | --- | --- | --- | --- |
| bi.identificarobjetivo | 🌟 Epic | Criar dashboard ligado a bolsas | Criar um dashboard com metricas sobre bolsas para apoiar a tomada de decisão | - | - |
|   bi.identificarobjetivo.identificarobjetivos | ⭐ Story | Identificar objetivos | Queremos identificar quais objetivos organizacionais estão relacionado a bolsa | - | - |
|     bi.identificarobjetivo.identificarobjetivos.entrevista | ✅ Task | Entrevistar | Entrevista os clientes para levantar os objetivos organizacionais relacionados bolsa | - | - |
|     bi.identificarobjetivo.identificarobjetivos.validar | ✅ Task | Validar dos da entrevista | Validar objetivos organizacionais | - | bi.identificarobjetivo.identificarobjetivos.entrevista |
|   bi.identificarobjetivo.identificarnecessidadeinformacao | ⭐ Story | Identificar as necessidades de informacao | Identificar quais informações são relevantes para responder os objetivos organizacionais | - | bi.identificarobjetivo.identificarobjetivos |
|     bi.identificarobjetivo.identificarnecessidadeinformacao.entrevista | ✅ Task | Entrevistar | Entrevista os clientes para levantar os objetivos organizacionais relacionados bolsa | - | bi.identificarobjetivo.identificarobjetivos.validar |
|     bi.identificarobjetivo.identificarnecessidadeinformacao.validar | ✅ Task | Validar necessidade de informação | Validar as necessidade de informação | - | bi.identificarobjetivo.identificarnecessidadeinformacao.entrevista |
|   bi.identificarobjetivo.definirmedidasindicadores | ⭐ Story | Identificar as Medidas e Indicadores | Identificar quais informações são as medidas e indicadores para as necessidades de informação | - | bi.identificarobjetivo.identificarnecessidadeinformacao |
|     bi.identificarobjetivo.definirmedidasindicadores.pesquisar | ✅ Task | Pesquisar sobre Medidas e Indicadores | Pesquisar sobre medidas e indicadores para atender a necessidade de informações | - | bi.identificarobjetivo.identificarobjetivos.validar |
|     bi.identificarobjetivo.definirmedidasindicadores.validar | ✅ Task | Validar as medidas e indicadores  | Validar medias e indicadores | - | bi.identificarobjetivo.definirmedidasindicadores.pesquisar |
| bi.levantarinfraestruturaleds | 🌟 Epic | Levantar Infraestrutura de ETL | Construir uma infraestrutura conectando o banco Conecta ao Stage Data e Power BI, com Apache Airflow. | - | - |
|   bi.levantarinfraestruturaleds.levantardatastage | ⭐ Story | Configurar o banco Stage Data | Configurar o banco de dados Stage Data para armazenar os dados extraídos do banco Conecta. | - | - |
|     bi.levantarinfraestruturaleds.levantardatastage.alinharcomdevops | ✅ Task | Alinhar com a equipe de DevOps | Alinhar permissões e acessos do bnaco com a equipe de DevOps. | - | - |
|     bi.levantarinfraestruturaleds.levantardatastage.verificarfuncionamentodatastage | ✅ Task | Verificar funcionamento do Stage Data | Testar a conectividade e validação do banco Stage Data | - | bi.levantarinfraestruturaleds.levantardatastage.alinharcomdevops |
|   bi.levantarinfraestruturaleds.configurarairflowetl | ⭐ Story | Configurar o Airflow para pipelines ETL | Configurar o Airflow para extrair dados do banco Conecta, transformá-los e carregá-los no banco Stage Data. | - | bi.levantarinfraestruturaleds.levantardatastage.verificarfuncionamentodatastage |
|     bi.levantarinfraestruturaleds.configurarairflowetl.instalarconfigurarairflow | ✅ Task | Instalar e configurar o Airflow | Instalar o Airflow e configurar conexões com os bancos Conecta e Stage Data. | - | - |
|     bi.levantarinfraestruturaleds.configurarairflowetl.criardagsetl | ✅ Task | Criar DAGs para pipelines ETL | Implementar DAGs básicas que realizam ETL entre os bancos Conecta e Stage Data. | - | bi.levantarinfraestruturaleds.configurarairflowetl.instalarconfigurarairflow |
|     bi.levantarinfraestruturaleds.configurarairflowetl.testarpipelinesetl | ✅ Task | Testar pipelines ETL | Executar e testar os pipelines criados. | - | bi.levantarinfraestruturaleds.configurarairflowetl.criardagsetl |
|   bi.levantarinfraestruturaleds.conectarbancoaopowerbi | ⭐ Story | Conectar banco Stage Data ao Power BI | Integrar o banco Stage Data ao Power BI para criar relatórios baseados nos dados processados do Stage Data. | - | bi.levantarinfraestruturaleds.configurarairflowetl.testarpipelinesetl |
|     bi.levantarinfraestruturaleds.conectarbancoaopowerbi.importardadosnopowerbi | ✅ Task | Importar dados no Power BI | Configurar a conexão do Power BI com o banco Stage Data e importar dados. | - | - |
|     bi.levantarinfraestruturaleds.conectarbancoaopowerbi.criarmodelopowerbi | ✅ Task | Criar modelo de dados no Power BI | Configurar relacionamentos e transformações no Power BI para estruturar os dados para visualização. | - | bi.levantarinfraestruturaleds.conectarbancoaopowerbi.importardadosnopowerbi |
|     bi.levantarinfraestruturaleds.conectarbancoaopowerbi.criarrelatoriospowerbi | ✅ Task | Validar relatórios e gráficos no Power BI | Garantir que os relatórios e gráficos gerados no Power BI estão corretos e atendem aos requisitos do projeto. | - | bi.levantarinfraestruturaleds.conectarbancoaopowerbi.criarmodelopowerbi |

