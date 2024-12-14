# ENTENDER OS OBJETIVOS ORGANIZACIONAIS

Entender os objetivos organizacionais da FAPES

## Dados do Sprint
* **Goal**:  Entender os objetivos organizacionais da FAPES
* **Data Início**: 25/11/2024
* **Data Fim**: 06/12/2024
* **Status**: CLOSED
## Sprint Backlog

|Nome |Descrição|Resposável |Data de Inicio Planejada| Data de Entrega Planejada| Data de Inicío | Data Entrega | Status|
|:----|:---------|:-------- |:----------------------:| :-----------------------:| :------------: |:------------:|:-----:|
|Entrevistar|Entrevista os clientes para levantar os objetivos organizacionais relacionados bolsa|Mateus Lannes |25/11/2024|25/11/2024|25/11/2024|06/12/2024|TODO|
|Entrevistar|Entrevista os clientes para levantar os objetivos organizacionais relacionados bolsa|Felipe Costabeber|25/11/2024|25/11/2024|25/11/2024|06/12/2024|DONE|
|Validar dos da entrevista|Validar objetivos organizacionais|Mateus Lannes |25/11/2024|25/11/2024|25/11/2024|06/12/2024|DONE|
|Entrevistar|Entrevista os clientes para levantar os objetivos organizacionais relacionados bolsa|Felipe Costabeber|25/11/2024|25/11/2024|25/11/2024|05/12/2024|DONE|
|Pesquisar sobre Medidas e Indicadores|Pesquisar sobre medidas e indicadores para atender a necessidade de informações|Mateus Lannes |25/11/2024|25/11/2024|25/11/2024|06/12/2024|DONE|
|Validar necessidade de informação|Validar as necessidade de informação|Mateus Lannes |25/11/2024|25/11/2024|25/11/2024|06/12/2024|TODO|
|Validar as medidas e indicadores |Validar medias e indicadores|Mateus Lannes |25/11/2024|25/11/2024|25/11/2024|06/12/2024|TODO|
     
## Gantt 

```mermaid
gantt
    dateFormat YYYY-MM-DD
    axisFormat %d/%m


    section Sprint - Entender os objetivos organizacionais
    Entrevistar (Real) :done, Entrevistar_actual, 2024-11-25, 2024-12-06
    Entrevistar (Real) :done, Entrevistar_actual, 2024-11-25, 2024-12-06
    Validar dos da entrevista (Real) :done, Validar dos da entrevista_actual, 2024-11-25, 2024-12-06
    Entrevistar (Real) :done, Entrevistar_actual, 2024-11-25, 2024-12-05
    Pesquisar sobre Medidas e Indicadores (Real) :done, Pesquisar sobre Medidas e Indicadores_actual, 2024-11-25, 2024-12-06
    Validar necessidade de informação (Real) :done, Validar necessidade de informação_actual, 2024-11-25, 2024-12-06
    Validar as medidas e indicadores  (Real) :done, Validar as medidas e indicadores _actual, 2024-11-25, 2024-12-06
```

# Análise de Dependências do Sprint

Análise gerada em: 14/12/2024, 16:59:52

## 🔍 Grafo de Dependências

```mermaid
graph BT
    classDef sprint fill:#a8e6cf,stroke:#333,stroke-width:2px;
    classDef done fill:#98fb98,stroke:#333,stroke-width:2px;
    classDef external fill:#ffd3b6,stroke:#333,stroke-width:1px;
    bi.identificarobjetivo.identificarobjetivos.entrevista["📝 Tarefa: Entrevistar<br>📊 Estado: DONE<br>👤 Responsável: Felipe Costabeber"]:::done
    bi.identificarobjetivo.identificarnecessidadeinformacao.validar["📝 Tarefa: Validar necessidade de informação<br>📊 Estado: TODO<br>👤 Responsável: Mateus Lannes "]:::sprint
    bi.identificarobjetivo.definirmedidasindicadores.validar["📝 Tarefa: Validar as medidas e indicadores <br>📊 Estado: TODO<br>👤 Responsável: Mateus Lannes "]:::sprint
    bi.identificarobjetivo.identificarnecessidadeinformacao.entrevista["📝 Tarefa: Entrevistar<br>📊 Estado: DONE<br>👤 Responsável: Felipe Costabeber"]:::done
    bi.identificarobjetivo.definirmedidasindicadores.pesquisar["📝 Tarefa: Pesquisar sobre Medidas e Indicadores<br>📊 Estado: DONE<br>👤 Responsável: Mateus Lannes "]:::done
    bi.identificarobjetivo.identificarobjetivos.validar["📝 Tarefa: Validar dos da entrevista<br>📊 Estado: DONE<br>👤 Responsável: Mateus Lannes "]:::done
    bi.identificarobjetivo.identificarobjetivos.validar --> bi.identificarobjetivo.identificarobjetivos.entrevista
    bi.identificarobjetivo.identificarnecessidadeinformacao.entrevista --> bi.identificarobjetivo.identificarobjetivos.validar
    bi.identificarobjetivo.definirmedidasindicadores.pesquisar --> bi.identificarobjetivo.identificarobjetivos.validar
    bi.identificarobjetivo.identificarnecessidadeinformacao.validar --> bi.identificarobjetivo.identificarnecessidadeinformacao.entrevista
    bi.identificarobjetivo.definirmedidasindicadores.validar --> bi.identificarobjetivo.definirmedidasindicadores.pesquisar
```

**Legenda:**
- 🟢 Verde Claro: Issues no sprint
- 🟢 Verde Escuro: Issues concluídas
- 🟡 Laranja: Dependências externas ao sprint
- ➡️ Linha sólida: Dependência no sprint
- ➡️ Linha pontilhada: Dependência externa

## 📋 Sugestão de Execução das Issues

| # | Título | Status | Responsável | Dependências |
|---|--------|--------|-------------|---------------|
| 1 | Entrevistar | DONE | Felipe Costabeber | 🆓 |
| 2 | Validar necessidade de informação | TODO | Mateus Lannes  | Entrevistar✅ |
| 3 | Validar as medidas e indicadores  | TODO | Mateus Lannes  | Pesquisar sobre Medidas e Indicadores✅ |
| 4 | Entrevistar | DONE | Felipe Costabeber | Validar dos da entrevista✅ |
| 5 | Pesquisar sobre Medidas e Indicadores | DONE | Mateus Lannes  | Validar dos da entrevista✅ |
| 6 | Validar dos da entrevista | DONE | Mateus Lannes  | Entrevistar✅ |

**Legenda das Dependências:**
- 🆓 Sem dependências
- ✅ Issue concluída
- ⚠️ Dependência externa ao sprint

            
## Cumulative Flow
![ Cumulative Flow](./charts/cfd-sprin1.svg)

## Throughput
![ Throughput](./charts/throuput-sprin1.svg)
        

        