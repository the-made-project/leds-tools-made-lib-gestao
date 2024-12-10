
        
        # LEVANTAR INFRAESTRUTURA DE BI NO LEDS
        Levantar a infraestrutura de BI no LEDS, contendo o banco Stage Data, Apache Airflow e Power BI conectados.

        ## Dados do Sprint
        * **Goal**:  Levantar a infraestrutura de BI no LEDS, contendo o banco Stage Data, Apache Airflow e Power BI conectados.
        * **Data Início**: 09/12/2024
        * **Data Fim**: 13/12/2024
        * **Status**: IN_PROGRESS
        ## Sprint Backlog

        |ID |Nome |Resposável |Data de Inicío | Data Planejada | Status|
        |:----    |:----|:--------  |:-------:       | :----------:  | :---: |
        |bi.identificarobjetivo.identificarnecessidadeinformacao.validar|Validar necessidade de informação|Mateus Lannes |09/12/2024|10/12/2024|TODO|
|bi.identificarobjetivo.definirmedidasindicadores.validar|Validar as medidas e indicadores |Mateus Lannes |09/12/2024|10/12/2024|TODO|
|bi.levantarinfraestruturaleds.levantardatastage.alinharcomdevops|Alinhar com a equipe de DevOps|Mateus Lannes |10/12/2024|10/12/2024|TODO|
|bi.levantarinfraestruturaleds.levantardatastage.verificarfuncionamentodatastage|Verificar funcionamento do Stage Data|Mateus Lannes |09/12/2024|10/12/2024|TODO|
|bi.levantarinfraestruturaleds.configurarairflowetl.instalarconfigurarairflow|Instalar e configurar o Airflow|Mateus Lannes |11/12/2024|11/12/2024|TODO|
|bi.levantarinfraestruturaleds.configurarairflowetl.criardagsetl|Criar DAGs para pipelines ETL|Mateus Lannes |11/12/2024|12/12/2024|TODO|
|bi.levantarinfraestruturaleds.configurarairflowetl.testarpipelinesetl|Testar pipelines ETL|Mateus Lannes |12/12/2024|12/12/2024|TODO|
|bi.levantarinfraestruturaleds.conectarbancoaopowerbi.importardadosnopowerbi|Importar dados no Power BI|Mateus Lannes |12/12/2024|12/12/2024|TODO|
|bi.levantarinfraestruturaleds.conectarbancoaopowerbi.criarmodelopowerbi|Criar modelo de dados no Power BI|Mateus Lannes |09/12/2024|13/12/2024|TODO|
|bi.levantarinfraestruturaleds.conectarbancoaopowerbi.criarrelatoriospowerbi|Validar relatórios e gráficos no Power BI|Mateus Lannes |09/12/2024|13/12/2024|TODO|
      
        # Análise de Dependências do Sprint

Análise gerada em: 10/12/2024, 14:09:35

## 🔍 Grafo de Dependências

```mermaid
graph BT
    classDef sprint fill:#a8e6cf,stroke:#333,stroke-width:2px;
    classDef done fill:#98fb98,stroke:#333,stroke-width:2px;
    classDef external fill:#ffd3b6,stroke:#333,stroke-width:1px;
    bi.identificarobjetivo.identificarnecessidadeinformacao.entrevista["🔍 bi.identificarobjetivo.identificarnecessidadeinformacao.entrevista<br>⚠️ Dependência Externa"]:::external
    bi.identificarobjetivo.definirmedidasindicadores.pesquisar["🔍 bi.identificarobjetivo.definirmedidasindicadores.pesquisar<br>⚠️ Dependência Externa"]:::external
    bi.identificarobjetivo.identificarnecessidadeinformacao.validar["🔍 Identificador: bi.identificarobjetivo.identificarnecessidadeinformacao.validar<br>📝 Tarefa: Validar necessidade de informação<br>📊 Estado: TODO<br>👤 Responsável: Mateus Lannes "]:::sprint
    bi.identificarobjetivo.definirmedidasindicadores.validar["🔍 Identificador: bi.identificarobjetivo.definirmedidasindicadores.validar<br>📝 Tarefa: Validar as medidas e indicadores <br>📊 Estado: TODO<br>👤 Responsável: Mateus Lannes "]:::sprint
    bi.levantarinfraestruturaleds.levantardatastage.alinharcomdevops["🔍 Identificador: bi.levantarinfraestruturaleds.levantardatastage.alinharcomdevops<br>📝 Tarefa: Alinhar com a equipe de DevOps<br>📊 Estado: TODO<br>👤 Responsável: Mateus Lannes "]:::sprint
    bi.levantarinfraestruturaleds.configurarairflowetl.instalarconfigurarairflow["🔍 Identificador: bi.levantarinfraestruturaleds.configurarairflowetl.instalarconfigurarairflow<br>📝 Tarefa: Instalar e configurar o Airflow<br>📊 Estado: TODO<br>👤 Responsável: Mateus Lannes "]:::sprint
    bi.levantarinfraestruturaleds.conectarbancoaopowerbi.importardadosnopowerbi["🔍 Identificador: bi.levantarinfraestruturaleds.conectarbancoaopowerbi.importardadosnopowerbi<br>📝 Tarefa: Importar dados no Power BI<br>📊 Estado: TODO<br>👤 Responsável: Mateus Lannes "]:::sprint
    bi.levantarinfraestruturaleds.levantardatastage.verificarfuncionamentodatastage["🔍 Identificador: bi.levantarinfraestruturaleds.levantardatastage.verificarfuncionamentodatastage<br>📝 Tarefa: Verificar funcionamento do Stage Data<br>📊 Estado: TODO<br>👤 Responsável: Mateus Lannes "]:::sprint
    bi.levantarinfraestruturaleds.configurarairflowetl.testarpipelinesetl["🔍 Identificador: bi.levantarinfraestruturaleds.configurarairflowetl.testarpipelinesetl<br>📝 Tarefa: Testar pipelines ETL<br>📊 Estado: TODO<br>👤 Responsável: Mateus Lannes "]:::sprint
    bi.levantarinfraestruturaleds.conectarbancoaopowerbi.criarrelatoriospowerbi["🔍 Identificador: bi.levantarinfraestruturaleds.conectarbancoaopowerbi.criarrelatoriospowerbi<br>📝 Tarefa: Validar relatórios e gráficos no Power BI<br>📊 Estado: TODO<br>👤 Responsável: Mateus Lannes "]:::sprint
    bi.levantarinfraestruturaleds.configurarairflowetl.criardagsetl["🔍 Identificador: bi.levantarinfraestruturaleds.configurarairflowetl.criardagsetl<br>📝 Tarefa: Criar DAGs para pipelines ETL<br>📊 Estado: TODO<br>👤 Responsável: Mateus Lannes "]:::sprint
    bi.levantarinfraestruturaleds.conectarbancoaopowerbi.criarmodelopowerbi["🔍 Identificador: bi.levantarinfraestruturaleds.conectarbancoaopowerbi.criarmodelopowerbi<br>📝 Tarefa: Criar modelo de dados no Power BI<br>📊 Estado: TODO<br>👤 Responsável: Mateus Lannes "]:::sprint
    bi.identificarobjetivo.identificarnecessidadeinformacao.validar -.-> bi.identificarobjetivo.identificarnecessidadeinformacao.entrevista
    bi.identificarobjetivo.definirmedidasindicadores.validar -.-> bi.identificarobjetivo.definirmedidasindicadores.pesquisar
    bi.levantarinfraestruturaleds.levantardatastage.verificarfuncionamentodatastage --> bi.levantarinfraestruturaleds.levantardatastage.alinharcomdevops
    bi.levantarinfraestruturaleds.configurarairflowetl.criardagsetl --> bi.levantarinfraestruturaleds.configurarairflowetl.instalarconfigurarairflow
    bi.levantarinfraestruturaleds.configurarairflowetl.testarpipelinesetl --> bi.levantarinfraestruturaleds.configurarairflowetl.criardagsetl
    bi.levantarinfraestruturaleds.conectarbancoaopowerbi.criarmodelopowerbi --> bi.levantarinfraestruturaleds.conectarbancoaopowerbi.importardadosnopowerbi
    bi.levantarinfraestruturaleds.conectarbancoaopowerbi.criarrelatoriospowerbi --> bi.levantarinfraestruturaleds.conectarbancoaopowerbi.criarmodelopowerbi
```

**Legenda:**
- 🟢 Verde Claro: Issues no sprint
- 🟢 Verde Escuro: Issues concluídas
- 🟡 Laranja: Dependências externas ao sprint
- ➡️ Linha sólida: Dependência no sprint
- ➡️ Linha pontilhada: Dependência externa

## 📋 Sugestão de Execução das Issues

| # | Issue | Título | Status | Responsável | Dependências |
|---|-------|--------|--------|-------------|---------------|
| 1 | bi.identificarobjetivo.identificarnecessidadeinformacao.validar | Validar necessidade de informação | TODO | Mateus Lannes  | bi.identificarobjetivo.identificarnecessidadeinformacao.entrevista⚠️ |
| 2 | bi.identificarobjetivo.definirmedidasindicadores.validar | Validar as medidas e indicadores  | TODO | Mateus Lannes  | bi.identificarobjetivo.definirmedidasindicadores.pesquisar⚠️ |
| 3 | bi.levantarinfraestruturaleds.levantardatastage.alinharcomdevops | Alinhar com a equipe de DevOps | TODO | Mateus Lannes  | 🆓 |
| 4 | bi.levantarinfraestruturaleds.configurarairflowetl.instalarconfigurarairflow | Instalar e configurar o Airflow | TODO | Mateus Lannes  | 🆓 |
| 5 | bi.levantarinfraestruturaleds.conectarbancoaopowerbi.importardadosnopowerbi | Importar dados no Power BI | TODO | Mateus Lannes  | 🆓 |
| 6 | bi.levantarinfraestruturaleds.levantardatastage.verificarfuncionamentodatastage | Verificar funcionamento do Stage Data | TODO | Mateus Lannes  | bi.levantarinfraestruturaleds.levantardatastage.alinharcomdevops |
| 7 | bi.levantarinfraestruturaleds.configurarairflowetl.testarpipelinesetl | Testar pipelines ETL | TODO | Mateus Lannes  | bi.levantarinfraestruturaleds.configurarairflowetl.criardagsetl |
| 8 | bi.levantarinfraestruturaleds.conectarbancoaopowerbi.criarrelatoriospowerbi | Validar relatórios e gráficos no Power BI | TODO | Mateus Lannes  | bi.levantarinfraestruturaleds.conectarbancoaopowerbi.criarmodelopowerbi |
| 9 | bi.levantarinfraestruturaleds.configurarairflowetl.criardagsetl | Criar DAGs para pipelines ETL | TODO | Mateus Lannes  | bi.levantarinfraestruturaleds.configurarairflowetl.instalarconfigurarairflow |
| 10 | bi.levantarinfraestruturaleds.conectarbancoaopowerbi.criarmodelopowerbi | Criar modelo de dados no Power BI | TODO | Mateus Lannes  | bi.levantarinfraestruturaleds.conectarbancoaopowerbi.importardadosnopowerbi |

**Legenda das Dependências:**
- 🆓 Sem dependências
- ✅ Issue concluída
- ⚠️ Dependência externa ao sprint

        
       
        ## Cumulative Flow
        ![ Cumulative Flow](./charts/cfd-sprint2.svg)
        
        # Previsão da Sprint

## ✅ SPRINT PROVAVELMENTE SERÁ CONCLUÍDA NO PRAZO

- **Probabilidade de conclusão no prazo**: 100.0%
- **Data mais provável de conclusão**: seg., 23/12/2024
- **Dias em relação ao planejado**: 11 dias
- **Status**: ❌ Atraso Crítico

### 📊 Métricas Críticas

| Métrica | Valor | Status |
|---------|--------|--------|
| Velocidade Atual | 1.0 tarefas/dia | ❌ |
| Velocidade Necessária | 3.3 tarefas/dia | - |
| Dias Restantes | 3 dias | - |
| Tarefas Restantes | 10 tarefas | - |

### 📅 Previsões de Data de Conclusão

| Data | Probabilidade | Status | Observação |
|------|---------------|---------|------------|
| seg., 23/12/2024 | 100.0% | ❌ Atraso Crítico | 📍 Data mais provável |

### 📋 Status das Tarefas

| Status | Quantidade | Porcentagem |
|--------|------------|-------------|
| Concluído | 0 | 0.0% |
| Em Andamento | 0 | 0.0% |
| A Fazer | 10 | 100.0% |

## 💡 Recomendações

1. ✅ Mantenha o ritmo atual de 1.0 tarefas/dia
2. ✅ Continue monitorando impedimentos
3. ✅ Prepare-se para a próxima sprint

## ℹ️ Informações da Sprint

- **Sprint**: Levantar Infraestrutura de BI no LEDS
- **Início**: seg., 09/12/2024
- **Término Planejado**: sex., 13/12/2024
- **Total de Tarefas**: 10
- **Simulações Realizadas**: 10,000

---
*Relatório gerado em 10/12/2024, 14:09:35*
        