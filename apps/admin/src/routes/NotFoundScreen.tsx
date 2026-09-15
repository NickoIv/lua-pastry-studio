import { useNavigate } from "react-router-dom";
import { Button, EmptyState, SearchIcon } from "@lua/ui";

export function NotFoundScreen() {
  const navigate = useNavigate();
  return (
    <EmptyState
      icon={<SearchIcon />}
      title="Страница не найдена"
      action={
        <Button variant="secondary" onClick={() => navigate("/")}>
          На дашборд
        </Button>
      }
    />
  );
}
