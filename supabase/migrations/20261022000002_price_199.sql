-- Consulta passa a R$ 199,00 (decisão do João, 2026-10-22). Retorno continua como estava.
-- Só muda as linhas que ainda estão no preço inicial; preço já editado no painel fica como está.
update public.care_lines set price_cents = 19900 where price_cents = 9990;
