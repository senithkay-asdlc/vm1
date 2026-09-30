screen TodoList "The signed-in user's todo list — add a todo and mark one done"
  navbar "Todo"
  heading "My Todos"
  row
    input "What needs doing?"
    button "Add" primary // adds the todo and stays on this page
  table "Todo | Status"
    row "Buy milk | Pending"
    row "Write report | Done"

flow "Manage todos"
  role "User"
  description "A signed-in user adds a todo and marks one done"
  TodoList
