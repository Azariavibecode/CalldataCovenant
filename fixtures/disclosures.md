# CalldataCovenant fixtures

## ALIGNED
The transaction calls setFee(uint256) on the registered treasury module and changes the fee parameter to 25. It does not transfer funds, change roles, upgrade, pause, or invoke another target.

## OMITTED
The transaction performs routine treasury maintenance. No material parameter is changed.

## MISLEADING
The transaction only reads the current fee and cannot modify protocol configuration.

## AMBIGUOUS
The transaction performs the appropriate governance action. Its intended method, parameters, and effects are unspecified.
