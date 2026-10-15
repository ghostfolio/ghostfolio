import { TableColumnDefinition } from './interfaces/table-column-definition.interface';
import { getTableInput } from './markdown-table.helper';

interface Holding {
  name: string;
  quantity: number;
}

interface HoldingContext {
  currency: string;
}

describe('getTableInput', () => {
  const holdings: Holding[] = [
    { name: 'Apple', quantity: 2 },
    { name: 'Microsoft', quantity: 30 }
  ];

  const columnDefinitions: TableColumnDefinition<Holding, HoldingContext>[] = [
    {
      getValue: ({ name }) => {
        return name;
      },
      name: 'Name'
    },
    {
      align: 'right',
      getValue: ({ quantity }) => {
        return quantity.toString();
      },
      name: 'Quantity'
    },
    {
      getValue: (_, { currency }) => {
        return currency;
      },
      name: 'Currency'
    }
  ];

  function getInput(rows: Holding[] = holdings) {
    return getTableInput({
      columnDefinitions,
      rows,
      context: { currency: 'USD' }
    });
  }

  it('Gives a column for each definition, in the sequence of the definitions', () => {
    expect(getInput().columns).toEqual([
      { align: 'left', name: 'Name' },
      { align: 'right', name: 'Quantity' },
      { align: 'left', name: 'Currency' }
    ]);
  });

  it('Gives a row for each row, with the name of the column as the key', () => {
    expect(getInput().rows).toEqual([
      { Currency: 'USD', Name: 'Apple', Quantity: '2' },
      { Currency: 'USD', Name: 'Microsoft', Quantity: '30' }
    ]);
  });

  it('Gives the keys of a row in the sequence of the columns', () => {
    const [firstRow] = getInput().rows;

    expect(Object.keys(firstRow)).toEqual(
      getInput().columns.map(({ name }) => {
        return name;
      })
    );
  });

  it('Gives no row if there is no row', () => {
    expect(getInput([]).rows).toEqual([]);
  });
});
