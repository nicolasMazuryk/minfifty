import React, { useEffect } from 'react'

import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import { useDispatch, useSelector } from 'react-redux'

import UserInfo from '@/components/UserInfo'
import { USER_STATUSES } from '@/constants/users'
import { listUsers, showUser } from '@/redux/users/actions'
import { list } from '@/redux/users/selectors'

import styles from './AdminUsersPage.module.scss'

const AdminUsersPage: React.FC = () => {
  const users = useSelector(list)
  const dispatch = useDispatch()

  useEffect(() => {
    dispatch(listUsers())
  }, [dispatch])

  return (
    <div className={styles.table}>
      <UserInfo />
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 450 }} aria-label="simple table">
          <TableHead>
            <TableRow>
              <TableCell>Email </TableCell>
              <TableCell>Username</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map(row => {
              const chipColor =
                row.status === USER_STATUSES.ACTIVE ? 'green' : 'gold'

              return (
                <TableRow
                  key={row.email}
                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                >
                  <TableCell component="th" scope="row">
                    {row.email}
                  </TableCell>
                  <TableCell component="th" scope="row">
                    {row.username}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={row.role}
                      sx={{
                        color: chipColor,
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={row.status}
                      sx={{
                        color: chipColor,
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      onClick={() => dispatch(showUser(row.id))}
                    >
                      INFO
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  )
}

export default AdminUsersPage
