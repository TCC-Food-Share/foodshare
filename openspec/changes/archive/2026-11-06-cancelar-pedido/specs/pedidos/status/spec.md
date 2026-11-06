## MODIFIED Requirements

### Requirement: Status finais
O sistema SHALL tratar "Rejeitado", "Doado" e "Cancelado" como status finais: um pedido em qualquer um deles NÃO muda mais de status. Toda tentativa de transição a partir de um status final — aceitar, rejeitar, confirmar o recebimento ou cancelar — SHALL ser recusada por conflito de estado (`409`), sem alterar o pedido.

#### Scenario: Ação sobre pedido em status final
- **WHEN** uma instituição tenta aceitar, rejeitar, confirmar o recebimento ou cancelar um pedido "Rejeitado", "Doado" ou "Cancelado"
- **THEN** o sistema recusa a operação por conflito de estado e o pedido continua no mesmo status
