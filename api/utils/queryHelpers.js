// Query helper functions for user filtering

// Add user_id filter to WHERE clause
export function addUserFilter(sql, params, userId, paramCount = 1) {
  if (!userId) {
    throw new Error("User ID is required for filtering");
  }
  
  // Check if WHERE clause already exists
  const hasWhere = sql.toUpperCase().includes("WHERE");
  
  if (hasWhere) {
    sql += ` AND user_id = $${paramCount}`;
  } else {
    sql += ` WHERE user_id = $${paramCount}`;
  }
  
  params.push(userId);
  return paramCount + 1;
}

// Verify user owns the resource
export async function verifyOwnership(query, table, id, userId) {
  const result = await query(
    `SELECT user_id FROM ${table} WHERE id = $1`,
    [id]
  );
  
  if (result.rows.length === 0) {
    return false; // Resource doesn't exist
  }
  
  const resourceUserId = result.rows[0].user_id;
  
  // If resource has no user_id (legacy data), allow access
  if (!resourceUserId) {
    return true;
  }
  
  return resourceUserId === userId;
}


