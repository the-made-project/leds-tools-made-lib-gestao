# Jira Endpoints

Com a lista de mapeamento de componentes do Made para componentes do Jira montada, precisamos identificar o CRUDL dos componentes usando o Jira REST API.

[Clique aqui e acesse a documentação do Jira REST API V3](https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/#about)

## Limitações

Identificamos algo que pode ser uma possível limitação.

Lendo a documentação, percebemos que o componente Sprint não está documentado no Jira REST API V3. Não conseguimos encontrá-lo por meio da documentação disponibilizada acima.

Pesquisando na web encontramos uma outra documentação disponibilizada pelo Jira que temos o CRUDL do componente Sprint Jira. E diferente da documentação do Jira REST API V3, o Sprint usa uma outra REST API.

[Clique aqui e acesse a documentação do Sprint do Jira](https://developer.atlassian.com/cloud/jira/software/rest/api-group-sprint/#api-group-sprint)

E como se trata de uma outra api, ela necessita de uma outra forma de autenticação das requisições. Ao invés do `username` e `api_token`, nesta api precisa de uma `access_token`.

Pesquisamos sobre esse mode de autenticação e, pelo que encontramos, precisamos criar uma aplicação na plataforma [Atlassian Developer Console](https://developer.atlassian.com/console/myapps/) e configurar o OAuth 2.0 para obter uma `access token` para as autenticações.

## Componentes do Jira

### Projects

```bash
curl --request POST \
  --url 'https://your-domain.atlassian.net/rest/api/3/project' \
  --user 'email@example.com:<api_token>' \
  --header 'Accept: application/json' \
  --header 'Content-Type: application/json' \
  --data '{
  "assigneeType": "PROJECT_LEAD",
  "avatarId": 10200,
  "categoryId": 10120,
  "description": "Cloud migration initiative",
  "issueSecurityScheme": 10001,
  "key": "EX",
  "leadAccountId": "5b10a0effa615349cb016cd8",
  "name": "Example",
  "notificationScheme": 10021,
  "permissionScheme": 10011,
  "projectTemplateKey": "com.atlassian.jira-core-project-templates:jira-core-simplified-process-control",
  "projectTypeKey": "business",
  "url": "http://atlassian.com"
}'
```

#### Project Issue Types

Como o Jira já possui os seus tipos de issue, quando tentamos criar as nossas issues com estes tipos de issues, a api responde 400 nos informando que não é válido criar uma issue com o tipo selecionado.

Mas quando criamos nosso projeto, o Jira criou os mesmos tipos de issue mas com escopo no nosso projeto. E, aí sim, conseguimos criar as nossas issues no projeto.

### Issue Fields

Para criar uma issue precisamos definir os campos que irá compor nossa issue.

```bash
curl --request GET \
  --url 'https://your-domain.atlassian.net/rest/api/3/field' \
  --user 'email@example.com:<api_token>' \
  --header 'Accept: application/json'
```

### Issue Types

Também para criar uma isue precisamor definir o tipo da issue.

```bash
curl --request GET \
  --url 'https://your-domain.atlassian.net/rest/api/3/issuetype' \
  --user 'email@example.com:<api_token>' \
  --header 'Accept: application/json'
```

### Issue Links

Importante também definir se nossa issue estará relacionada a uma outra issue. Para isso precisamos definir as issues relacionadas com o tipo de link.

```bash
curl --request GET \
  --url 'https://your-domain.atlassian.net/rest/api/3/issueLinkType' \
  --user 'email@example.com:<api_token>' \
  --header 'Accept: application/json'
```

### Issues

Agora sim, com os principais elementos definidos para compor nossa issue vamos criá-la de fato.

```bash
curl --request POST \
  --url 'https://your-domain.atlassian.net/rest/api/3/issue' \
  --user 'email@example.com:<api_token>' \
  --header 'Accept: application/json' \
  --header 'Content-Type: application/json' \
  --data '{
  "fields": {
    "issuetype": {
      "id": "10000"
    },
    "parent": {
      "key": "PROJ-123"
    },
    "project": {
      "id": "10000"
    },
    "summary": "Main order flow broken"
  },
  "update": {
    "issuelinks": [
      {
        "add": {
          "type": {
            "name": "Relates"
          },
          "inwardIssue": {
            "key": "EXISTING_ISSUE_KEY"
          },
          "outwardIssue": {
            "key": "EXISTING_ISSUE_KEY"
          }
        }
      }
    ]
  }
}'
```

### Workflows

Cria o workflow e status relacionados.

```bash
curl --request POST \
  --url 'https://your-domain.atlassian.net/rest/api/3/workflows/create' \
  --user 'email@example.com:<api_token>' \
  --header 'Accept: application/json' \
  --header 'Content-Type: application/json' \
  --data '{
  "scope": {
    "type": "GLOBAL"
  },
  "statuses": [
    {
      "description": "",
      "name": "To Do",
      "statusCategory": "TODO",
      "statusReference": "f0b24de5-25e7-4fab-ab94-63d81db6c0c0"
    },
    {
      "description": "",
      "name": "In Progress",
      "statusCategory": "IN_PROGRESS",
      "statusReference": "c7a35bf0-c127-4aa6-869f-4033730c61d8"
    },
    {
      "description": "",
      "name": "Done",
      "statusCategory": "DONE",
      "statusReference": "6b3fc04d-3316-46c5-a257-65751aeb8849"
    }
  ],
  "workflows": [
    {
      "description": "",
      "name": "Software workflow 1",
      "startPointLayout": {
        "x": -100.00030899047852,
        "y": -153.00020599365234
      },
      "statuses": [
        {
          "layout": {
            "x": 114.99993896484375,
            "y": -16
          },
          "properties": {},
          "statusReference": "f0b24de5-25e7-4fab-ab94-63d81db6c0c0"
        },
        {
          "layout": {
            "x": 317.0000915527344,
            "y": -16
          },
          "properties": {},
          "statusReference": "c7a35bf0-c127-4aa6-869f-4033730c61d8"
        },
        {
          "layout": {
            "x": 508.000244140625,
            "y": -16
          },
          "properties": {},
          "statusReference": "6b3fc04d-3316-46c5-a257-65751aeb8849"
        }
      ],
      "transitions": [
        {
          "actions": [],
          "description": "",
          "id": "1",
          "links": [],
          "name": "Create",
          "properties": {},
          "toStatusReference": "f0b24de5-25e7-4fab-ab94-63d81db6c0c0",
          "triggers": [],
          "type": "INITIAL",
          "validators": []
        },
        {
          "actions": [],
          "description": "",
          "id": "11",
          "links": [],
          "name": "To Do",
          "properties": {},
          "toStatusReference": "f0b24de5-25e7-4fab-ab94-63d81db6c0c0",
          "triggers": [],
          "type": "GLOBAL",
          "validators": []
        },
        {
          "actions": [],
          "description": "",
          "id": "21",
          "links": [],
          "name": "In Progress",
          "properties": {},
          "toStatusReference": "c7a35bf0-c127-4aa6-869f-4033730c61d8",
          "triggers": [],
          "type": "GLOBAL",
          "validators": []
        },
        {
          "actions": [],
          "description": "Move a work item from in progress to done",
          "id": "31",
          "links": [
            {
              "fromPort": 0,
              "fromStatusReference": "c7a35bf0-c127-4aa6-869f-4033730c61d8",
              "toPort": 1
            }
          ],
          "name": "Done",
          "properties": {},
          "toStatusReference": "6b3fc04d-3316-46c5-a257-65751aeb8849",
          "triggers": [],
          "type": "DIRECTED",
          "validators": []
        }
      ]
    }
  ]
}'
```

### Sprints

Cria as sprints futuras do projeto.

```bash
curl --request POST \
  --url 'https://your-domain.atlassian.net/rest/agile/1.0/sprint' \
  --header 'Authorization: Bearer <access_token>' \
  --header 'Accept: application/json' \
  --header 'Content-Type: application/json' \
  --data '{
  "endDate": "2015-04-20T01:22:00.000+10:00",
  "goal": "sprint 1 goal",
  "name": "sprint 1",
  "originBoardId": 5,
  "startDate": "2015-04-11T15:22:00.000+10:00"
}'
```
