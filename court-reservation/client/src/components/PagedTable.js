import { Table } from "antd";

const PagedTable = ({ columns, paged }) => (
  <Table
    rowKey="_id"
    columns={columns}
    dataSource={paged.data}
    loading={paged.loading}
    scroll={{ x: true }}
    pagination={{
      current: paged.page,
      pageSize: paged.limit,
      total: paged.total,
      showSizeChanger: false,
      showTotal: (total, range) => `Showing ${range[0]}-${range[1]} of ${total}`,
      onChange: paged.setPage,
    }}
  />
);

export default PagedTable;
